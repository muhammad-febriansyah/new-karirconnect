<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\JobStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\JobResource;
use App\Models\Job;
use App\Services\Jobs\SavedJobService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SavedJobController extends Controller
{
    public function __construct(private readonly SavedJobService $savedJobs) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $saved = $request->user()->savedJobs()
            ->with([
                'job.company:id,name,slug,logo_path,verification_status',
                'job.category:id,name',
                'job.city:id,name',
                'job.skills:id,name',
            ])
            ->when($request->filled('search'), function ($query) use ($request): void {
                $term = $request->string('search')->toString();

                $query->whereHas('job', fn ($jobQuery) => $jobQuery
                    ->where('title', 'like', "%{$term}%")
                    ->orWhereHas('company', fn ($c) => $c->where('name', 'like', "%{$term}%"))
                );
            })
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50))
            ->withQueryString();

        // The saved row is just a join; the client wants the job. Reuse
        // JobResource so a saved job masks salary and anonymity identically to
        // every other listing.
        $saved->setCollection(
            $saved->getCollection()->map(fn ($savedJob) => $savedJob->job)->filter()->values()
        );

        return JobResource::collection($saved);
    }

    /**
     * Save a job. Idempotent: saving twice is not an error.
     */
    public function store(Request $request, Job $job): JsonResponse
    {
        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        abort_unless(
            $job->status === JobStatus::Published,
            422,
            'Hanya lowongan aktif yang bisa disimpan.',
        );

        $user = $request->user();

        // Not SavedJobService::toggle(): a REST save must be idempotent, and
        // toggle() would silently unsave on a repeated call (e.g. a retry after
        // a dropped response).
        $user->savedJobs()->updateOrCreate(
            ['job_id' => $job->id],
            ['note' => $validated['note'] ?? null],
        );

        return response()->json(['message' => 'Lowongan disimpan.', 'data' => ['is_saved' => true]], 201);
    }

    public function destroy(Request $request, Job $job): JsonResponse
    {
        $request->user()->savedJobs()->where('job_id', $job->id)->delete();

        return response()->json(['message' => 'Lowongan dihapus dari simpanan.', 'data' => ['is_saved' => false]]);
    }
}
