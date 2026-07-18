<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\JobStatus;
use App\Filters\Jobs\JobBrowseFilter;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\JobIndexRequest;
use App\Http\Resources\Api\V1\JobDetailResource;
use App\Http\Resources\Api\V1\JobResource;
use App\Models\Application;
use App\Models\Job;
use App\Models\JobView;
use App\Models\User;
use App\Services\Jobs\JobMatchingService;
use App\Services\Jobs\JobService;
use App\Services\Jobs\SavedJobService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;

/**
 * Public job browsing for the mobile client.
 *
 * Reuses JobBrowseFilter, the same query object the web listing uses, so the
 * published / deadline / visibility gates cannot drift between the two
 * surfaces.
 */
class JobController extends Controller
{
    public function __construct(
        private readonly JobBrowseFilter $filter,
        private readonly JobService $jobs,
        private readonly JobMatchingService $matching,
        private readonly SavedJobService $savedJobs,
    ) {}

    public function index(JobIndexRequest $request): AnonymousResourceCollection
    {
        $jobs = $this->filter
            ->apply($request->filters())
            ->paginate($request->perPage())
            ->withQueryString();

        return JobResource::collection($jobs);
    }

    public function show(Request $request, Job $job): JsonResponse
    {
        // A draft, closed, or archived posting is not public. 404 rather than
        // 403: the existence of an unpublished job is itself not public.
        abort_unless($job->status === JobStatus::Published, 404);

        $job->load([
            'company:id,name,slug,logo_path,about,verification_status,website',
            'category:id,name,slug',
            'province:id,name',
            'city:id,name,province_id',
            'skills:id,name',
            'screeningQuestions',
        ]);

        $viewer = $this->optionalViewer();

        $this->recordView($request, $job, $viewer);

        $payload = [
            'data' => new JobDetailResource($job),
            'meta' => [
                'similar' => JobResource::collection($this->similarJobs($job)),
            ],
        ];

        if ($viewer !== null) {
            $payload['meta'] += $this->viewerContext($job, $viewer);
        }

        return response()->json($payload);
    }

    /**
     * This route is public, so there is no auth middleware to populate the
     * request's user, and $request->user() would resolve the session guard and
     * always come back null for a mobile caller. Read the bearer token through
     * the api guard instead, and treat a bad token as "guest" rather than an
     * error: a broken token should not make a public page fail.
     */
    private function optionalViewer(): ?User
    {
        try {
            return Auth::guard('api')->user();
        } catch (JWTException) {
            return null;
        }
    }

    /**
     * Mirrors the web detail page so mobile traffic lands in the same counters
     * and job_views rows the employer analytics already read.
     */
    private function recordView(Request $request, Job $job, ?User $viewer): void
    {
        $this->jobs->incrementViews($job);

        JobView::query()->create([
            'job_id' => $job->id,
            'user_id' => $viewer?->id,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
            'source' => $request->headers->get('referer'),
        ]);
    }

    /**
     * @return Collection<int, Job>
     */
    private function similarJobs(Job $job)
    {
        return Job::query()
            ->with([
                'company:id,name,slug,logo_path,verification_status',
                'city:id,name',
                'category:id,name',
            ])
            ->where('id', '!=', $job->id)
            ->where('status', JobStatus::Published)
            ->where('job_category_id', $job->job_category_id)
            ->latest('published_at')
            ->limit(4)
            ->get();
    }

    /**
     * Viewer-specific extras, kept under meta so the job payload itself is
     * identical for every caller.
     *
     * @return array<string, mixed>
     */
    private function viewerContext(Job $job, User $user): array
    {
        $context = ['is_saved' => $this->savedJobs->isSaved($user, $job)];

        $profile = $user->employeeProfile()
            ->with(['skills:id', 'city:id,province_id'])
            ->first();

        if ($profile !== null) {
            $breakdown = $this->matching->breakdown($job, $profile);

            $context['match_score'] = $breakdown['score'];
            $context['match_breakdown'] = $breakdown['breakdown'];

            // Lets the client show an already-applied state instead of offering
            // a button that the submit guard would only reject as a duplicate.
            $context['has_applied'] = Application::query()
                ->where('job_id', $job->id)
                ->where('employee_profile_id', $profile->id)
                ->exists();
        }

        return $context;
    }
}
