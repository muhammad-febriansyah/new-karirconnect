<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Applications\SubmitApplicationAction;
use App\Enums\ApplicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Applications\SubmitApplicationRequest;
use App\Http\Resources\Api\V1\ApplicationDetailResource;
use App\Http\Resources\Api\V1\ApplicationResource;
use App\Models\Application;
use App\Models\ApplicationStatusLog;
use App\Models\Job;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Jobseeker applications.
 *
 * Submitting reuses SubmitApplicationAction, which owns every guard (published
 * job, duplicate, own-company, 60% profile completion), the status log, the
 * match score, the employer notification, and the AI interview auto-invite.
 * Its ValidationException / AuthorizationException already render as JSON for
 * api/* via bootstrap/app.php.
 */
class ApplicationController extends Controller
{
    /**
     * Statuses a candidate can no longer walk away from: the process is
     * already over, so withdrawing would rewrite history rather than stop it.
     */
    private const TERMINAL_STATUSES = [
        ApplicationStatus::Hired,
        ApplicationStatus::Rejected,
        ApplicationStatus::Withdrawn,
    ];

    public function __construct(private readonly EmployeeProfileService $profiles) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $applications = Application::query()
            ->with(['job:id,title,slug,company_id,is_anonymous', 'job.company:id,name,slug,logo_path'])
            ->where('employee_profile_id', $profile->id)
            ->when(
                $request->filled('status'),
                fn ($query) => $query->where('status', $request->string('status')->toString())
            )
            ->orderByDesc('applied_at')
            ->paginate(min($request->integer('per_page') ?: 20, 50))
            ->withQueryString();

        return ApplicationResource::collection($applications);
    }

    public function show(Request $request, Application $application): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        // Matches Employee\ApplicationController::show. The base Controller has
        // no AuthorizesRequests trait and nothing in this codebase calls
        // $this->authorize(), so ownership is checked inline as it is elsewhere.
        abort_unless($application->employee_profile_id === $profile->id, 403);

        $application->load([
            'job:id,title,slug,company_id,is_anonymous',
            'job.company:id,name,slug,logo_path',
            'candidateCv:id,label,file_path',
            'statusLogs.changedBy:id,name',
            'screeningAnswers',
        ]);

        return response()->json(['data' => new ApplicationDetailResource($application)]);
    }

    public function store(SubmitApplicationRequest $request, Job $job, SubmitApplicationAction $submit): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $application = $submit->execute($job, $profile, $request->validated());

        $application->load(['job:id,title,slug,company_id,is_anonymous', 'job.company:id,name,slug,logo_path']);

        return response()->json(
            ['data' => new ApplicationDetailResource($application)],
            201,
        );
    }

    /**
     * Withdraw an application.
     *
     * ApplicationPolicy::withdraw already existed but nothing ever called it --
     * there is no web route, action, or service for this, so the transition is
     * written here. It mirrors how SubmitApplicationAction records history:
     * status plus an ApplicationStatusLog row, in one transaction.
     */
    public function withdraw(Request $request, Application $application): JsonResponse
    {
        // ApplicationPolicy::withdraw already encodes this rule, so call it via
        // the user rather than restate it: $user->can() resolves the policy
        // without needing a trait on the controller.
        abort_unless($request->user()->can('withdraw', $application), 403);

        if (in_array($application->status, self::TERMINAL_STATUSES, true)) {
            return response()->json([
                'message' => 'Lamaran ini sudah selesai dan tidak dapat dibatalkan.',
                'code' => 'application_not_withdrawable',
            ], 422);
        }

        DB::transaction(function () use ($application, $request): void {
            $previous = $application->status;

            $application->forceFill(['status' => ApplicationStatus::Withdrawn])->save();

            ApplicationStatusLog::query()->create([
                'application_id' => $application->id,
                'from_status' => $previous?->value,
                'to_status' => ApplicationStatus::Withdrawn->value,
                'changed_by_user_id' => $request->user()->id,
                'note' => 'Lamaran dibatalkan oleh kandidat.',
            ]);
        });

        return response()->json([
            'message' => 'Lamaran dibatalkan.',
            'data' => new ApplicationResource($application->fresh()),
        ]);
    }
}
