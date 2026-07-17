<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\JobAlertRequest;
use App\Http\Resources\Api\V1\JobResource;
use App\Models\JobAlert;
use App\Services\JobAlerts\JobAlertDispatcher;
use App\Services\JobAlerts\JobAlertMatcherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobAlertController extends Controller
{
    public function __construct(
        private readonly JobAlertMatcherService $matcher,
        private readonly JobAlertDispatcher $dispatcher,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $alerts = $request->user()->jobAlerts()
            ->with(['category:id,name', 'city:id,name'])
            ->latest('id')
            ->get()
            ->map(fn (JobAlert $alert) => $this->present($alert));

        return response()->json(['data' => $alerts]);
    }

    public function store(JobAlertRequest $request): JsonResponse
    {
        $alert = JobAlert::query()->create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->present($alert->fresh(['category', 'city']))], 201);
    }

    public function update(JobAlertRequest $request, JobAlert $alert): JsonResponse
    {
        $this->ensureOwnership($request, $alert);

        $alert->update($request->validated());

        return response()->json(['data' => $this->present($alert->fresh(['category', 'city']))]);
    }

    public function destroy(Request $request, JobAlert $alert): JsonResponse
    {
        $this->ensureOwnership($request, $alert);

        $alert->delete();

        return response()->json(['message' => 'Alert dihapus.']);
    }

    /**
     * What this alert would match right now, so the user can tune the filters
     * before waiting for a digest.
     */
    public function preview(Request $request, JobAlert $alert): JsonResponse
    {
        $this->ensureOwnership($request, $alert);

        $matches = $this->matcher->match($alert);

        return response()->json([
            // JobResource, not a hand-built row: the web preview emits
            // company?->name directly, which would name the employer behind an
            // anonymous posting.
            'data' => JobResource::collection($matches->take(10)),
            'meta' => ['count' => $matches->count()],
        ]);
    }

    /**
     * Send this alert's digest immediately.
     */
    public function dispatchNow(Request $request, JobAlert $alert): JsonResponse
    {
        $this->ensureOwnership($request, $alert);

        $count = $this->dispatcher->dispatchOne($alert, force: true);

        return response()->json([
            'message' => $count > 0
                ? "Digest terkirim dengan {$count} lowongan yang cocok."
                : 'Belum ada lowongan yang cocok. Coba longgarkan filter.',
            'data' => ['matched' => $count],
        ]);
    }

    private function ensureOwnership(Request $request, JobAlert $alert): void
    {
        abort_unless($alert->user_id === $request->user()->id, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(JobAlert $alert): array
    {
        return [
            'id' => $alert->id,
            'name' => $alert->name,
            'keyword' => $alert->keyword,
            'job_category_id' => $alert->job_category_id,
            'category' => $alert->category?->name,
            'city_id' => $alert->city_id,
            'city' => $alert->city?->name,
            'province_id' => $alert->province_id,
            'experience_level' => $alert->experience_level?->value,
            'employment_type' => $alert->employment_type,
            'work_arrangement' => $alert->work_arrangement,
            'salary_min' => $alert->salary_min,
            'frequency' => $alert->frequency,
            'is_active' => (bool) $alert->is_active,
            'last_sent_at' => $alert->last_sent_at?->toIso8601String(),
            'total_matches_sent' => $alert->total_matches_sent,
        ];
    }
}
