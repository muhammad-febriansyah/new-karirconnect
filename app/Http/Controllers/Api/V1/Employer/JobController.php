<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Enums\JobStatus;
use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\StoreJobRequest;
use App\Http\Requests\Employer\UpdateJobRequest;
use App\Http\Resources\Api\V1\JobDetailResource;
use App\Http\Resources\Api\V1\JobResource;
use App\Models\Company;
use App\Models\Job;
use App\Services\Jobs\JobService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Employer job management.
 *
 * Writes go through JobService rather than being inlined the way the web
 * controller does it, so slug generation, rich-text sanitising and skill sync
 * all have one implementation.
 */
class JobController extends Controller
{
    use ResolvesEmployerCompany;

    public function __construct(private readonly JobService $jobs) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $company = $this->requireCompany($request);

        $jobs = $company->jobs()
            ->with(['company:id,name,slug,logo_path,verification_status', 'category:id,name', 'city:id,name'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('search'), fn ($query) => $query->where('title', 'like', '%'.$request->string('search')->toString().'%'))
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50))
            ->withQueryString();

        return JobResource::collection($jobs);
    }

    public function show(Request $request, Job $job): JsonResponse
    {
        $this->authorizeJob($request, $job);

        $job->load(['company', 'category', 'province', 'city', 'skills', 'screeningQuestions']);

        return response()->json(['data' => new JobDetailResource($job)]);
    }

    public function store(StoreJobRequest $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        if ($denied = $this->quotaCheck($company)) {
            return $denied;
        }

        $data = $request->validated();
        $skillIds = $data['skill_ids'] ?? [];
        unset($data['skill_ids'], $data['slug'], $data['status']);

        $job = $this->jobs->create(
            $company->id,
            $request->user(),
            $data,
            $this->skillPayload($skillIds),
        );

        // JobService::create always starts a job as a draft. Publishing is a
        // separate, explicit step so the employer can review before it goes
        // live -- and so quota is only consumed once, here.
        if ($request->string('status')->toString() === JobStatus::Published->value) {
            $this->jobs->publish($job);
        }

        $company->activeSubscription()?->increment('jobs_posted_count');

        return response()->json(
            ['data' => new JobDetailResource($job->fresh(['company', 'category', 'city', 'skills']))],
            201,
        );
    }

    public function update(UpdateJobRequest $request, Job $job): JsonResponse
    {
        $this->authorizeJob($request, $job);

        $data = $request->validated();
        $skillIds = $data['skill_ids'] ?? [];
        unset($data['skill_ids'], $data['slug'], $data['status']);

        $this->jobs->update($job, $data, $this->skillPayload($skillIds));

        return response()->json([
            'data' => new JobDetailResource($job->fresh(['company', 'category', 'city', 'skills'])),
        ]);
    }

    public function publish(Request $request, Job $job): JsonResponse
    {
        $this->authorizeJob($request, $job);

        $this->jobs->publish($job);

        return response()->json(['data' => new JobResource($job->fresh(['company', 'category', 'city']))]);
    }

    public function close(Request $request, Job $job): JsonResponse
    {
        $this->authorizeJob($request, $job);

        $this->jobs->close($job);

        return response()->json(['data' => new JobResource($job->fresh(['company', 'category', 'city']))]);
    }

    public function archive(Request $request, Job $job): JsonResponse
    {
        $this->authorizeJob($request, $job);

        $this->jobs->archive($job);

        return response()->json(['data' => new JobResource($job->fresh(['company', 'category', 'city']))]);
    }

    /**
     * Mirrors the web store(): posting needs an active subscription with quota
     * left. Returns a response when the post should be refused, null when it
     * may proceed.
     */
    private function quotaCheck(Company $company): ?JsonResponse
    {
        $subscription = $company->activeSubscription();

        if ($subscription === null) {
            return response()->json([
                'message' => 'Langganan tidak aktif. Aktifkan paket untuk memposting lowongan.',
                'code' => 'subscription_required',
            ], 403);
        }

        $quota = $subscription->plan?->job_post_quota ?? 0;

        if ($quota > 0 && $subscription->jobs_posted_count >= $quota) {
            return response()->json([
                'message' => "Kuota posting paket {$subscription->plan?->name} sudah habis ({$quota} lowongan).",
                'code' => 'job_quota_exceeded',
                'data' => ['quota' => $quota, 'used' => $subscription->jobs_posted_count],
            ], 403);
        }

        return null;
    }

    /**
     * @param  array<int, int>  $skillIds
     * @return array<int, array{id: int, proficiency: string, is_required: bool}>
     */
    private function skillPayload(array $skillIds): array
    {
        return collect($skillIds)
            ->map(fn (int $id) => ['id' => $id, 'proficiency' => 'mid', 'is_required' => false])
            ->all();
    }
}
