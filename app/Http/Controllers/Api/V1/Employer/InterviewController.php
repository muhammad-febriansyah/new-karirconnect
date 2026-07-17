<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Actions\Interviews\RescheduleInterviewAction;
use App\Actions\Interviews\ScheduleInterviewAction;
use App\Enums\InterviewStage;
use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Http\Requests\Interviews\BulkScheduleInterviewRequest;
use App\Http\Requests\Interviews\ScheduleInterviewRequest;
use App\Http\Requests\Interviews\SubmitScorecardRequest;
use App\Http\Resources\Api\V1\InterviewResource;
use App\Models\Application;
use App\Models\Interview;
use App\Models\InterviewRescheduleRequest;
use App\Notifications\InterviewStageChangedNotification;
use App\Services\Interviews\InterviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The employer's side of interviews.
 */
class InterviewController extends Controller
{
    use ResolvesEmployerCompany;

    public function __construct(
        private readonly ScheduleInterviewAction $schedule,
        private readonly RescheduleInterviewAction $reschedule,
        private readonly InterviewService $interviews,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $company = $this->requireCompany($request);

        $interviews = Interview::query()
            ->with([
                'application:id,job_id,employee_profile_id',
                'application.job:id,title,slug,company_id',
                // InterviewResource reads job.company->name. Without this the
                // list lazy-loads the company once per row.
                'application.job.company:id,name',
                'application.employeeProfile.user:id,name',
                'participants.user:id,name',
            ])
            ->whereHas('application.job', fn ($query) => $query->where('company_id', $company->id))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->boolean('upcoming'), fn ($query) => $query->where('scheduled_at', '>=', now()))
            ->orderBy('scheduled_at')
            ->paginate(min($request->integer('per_page') ?: 20, 50))
            ->withQueryString();

        return InterviewResource::collection($interviews);
    }

    public function show(Request $request, Interview $interview): JsonResponse
    {
        $this->authorizeInterview($request, $interview);

        $interview->load([
            'application.job:id,title,slug,company_id',
            'application.job.company:id,name',
            'application.employeeProfile.user:id,name,email',
            'participants.user:id,name',
            'rescheduleRequests',
            'scorecards',
        ]);

        return response()->json(['data' => new InterviewResource($interview)]);
    }

    public function store(ScheduleInterviewRequest $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        // ScheduleInterviewRequest validates application_id with a bare exists
        // rule, so the ownership check has to happen here: scoping the lookup
        // to this company turns another company's application into a 404
        // rather than a schedulable target.
        $application = Application::query()
            ->whereHas('job', fn ($query) => $query->where('company_id', $company->id))
            ->findOrFail($request->validated('application_id'));

        $interview = $this->schedule->execute($application, $request->user(), $request->validated());

        return response()->json([
            'data' => new InterviewResource($interview->fresh(['application.job.company', 'participants.user'])),
        ], 201);
    }

    /**
     * Move an interview through its lifecycle.
     */
    public function changeStatus(Request $request, Interview $interview): JsonResponse
    {
        $this->authorizeInterview($request, $interview);

        $data = $request->validate([
            'status' => ['required', Rule::in(['ongoing', 'completed', 'cancelled', 'no_show'])],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        match ($data['status']) {
            'ongoing' => $this->interviews->markOngoing($interview),
            'completed' => $this->interviews->markCompleted($interview),
            'no_show' => $this->interviews->markNoShow($interview),
            'cancelled' => $this->interviews->cancel($interview, $data['note'] ?? null),
        };

        return response()->json(['data' => new InterviewResource($interview->fresh())]);
    }

    /**
     * Schedule the same interview for many candidates at once.
     *
     * Rows are scheduled independently: one candidate failing (a clashing slot,
     * say) must not abort the rest, so successes and failures are both reported
     * and the client can retry only what failed.
     */
    public function bulkStore(BulkScheduleInterviewRequest $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $data = $request->validated();
        $timezone = $data['timezone'] ?? 'Asia/Jakarta';
        $start = Carbon::parse($data['start_at'], $timezone);
        $duration = (int) $data['duration_minutes'];
        $gap = (int) $data['gap_minutes'];
        $groupMode = (bool) ($data['group_mode'] ?? false);

        // Scoped to this company: BulkScheduleInterviewRequest validates the ids
        // only with a bare exists rule.
        $applications = Application::query()
            ->with('employeeProfile.user:id,name')
            ->whereHas('job', fn ($query) => $query->where('company_id', $company->id))
            ->whereIn('id', $data['application_ids'])
            ->get()
            ->keyBy('id');

        $missing = collect($data['application_ids'])->reject(fn ($id) => $applications->has((int) $id));

        if ($missing->isNotEmpty()) {
            throw ValidationException::withMessages([
                'application_ids' => 'Beberapa lamaran tidak ditemukan atau bukan milik perusahaan ini.',
            ]);
        }

        $succeeded = [];
        $failed = [];

        foreach (array_values((array) $data['application_ids']) as $index => $applicationId) {
            $application = $applications->get((int) $applicationId);

            // Group mode puts everyone in one slot; otherwise each candidate
            // gets their own consecutive window.
            $slotStart = $groupMode
                ? $start->copy()
                : $start->copy()->addMinutes($index * ($duration + $gap));

            try {
                $interview = $this->schedule->execute($application, $request->user(), [
                    ...$data,
                    'scheduled_at' => $slotStart->toIso8601String(),
                    'duration_minutes' => $duration,
                    'timezone' => $timezone,
                ]);

                $succeeded[] = [
                    'interview_id' => $interview->id,
                    'application_id' => $application->id,
                    'candidate' => $application->employeeProfile?->user?->name,
                    'scheduled_at' => $slotStart->toIso8601String(),
                ];
            } catch (ValidationException $e) {
                $failed[] = [
                    'application_id' => $application->id,
                    'candidate' => $application->employeeProfile?->user?->name,
                    'reason' => collect($e->errors())->flatten()->first() ?? 'Gagal dijadwalkan.',
                ];
            }
        }

        return response()->json([
            'data' => ['scheduled' => $succeeded, 'failed' => $failed],
            'meta' => ['scheduled_count' => count($succeeded), 'failed_count' => count($failed)],
        ], count($succeeded) > 0 ? 201 : 422);
    }

    /**
     * Submit or replace this reviewer's scorecard.
     *
     * Keyed on reviewer_id, so each interviewer has exactly one scorecard and
     * resubmitting edits their own rather than stacking duplicates.
     */
    public function storeScorecard(SubmitScorecardRequest $request, Interview $interview): JsonResponse
    {
        $this->authorizeInterview($request, $interview);

        $scorecard = $interview->scorecards()->updateOrCreate(
            ['reviewer_id' => $request->user()->id],
            [...$request->validated(), 'submitted_at' => now()],
        );

        return response()->json([
            'data' => [
                'id' => $scorecard->id,
                'overall_score' => $scorecard->overall_score,
                'recommendation' => $scorecard->recommendation,
                'submitted_at' => $scorecard->submitted_at?->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * Move an interview to another stage, notifying the candidate.
     */
    public function changeStage(Request $request, Interview $interview): JsonResponse
    {
        $this->authorizeInterview($request, $interview);

        $data = $request->validate([
            'stage' => ['required', Rule::enum(InterviewStage::class)],
        ]);

        $previous = $interview->stage;
        $next = InterviewStage::from($data['stage']);

        // A no-op must not notify the candidate again.
        if ($previous === $next) {
            return response()->json(['data' => new InterviewResource($interview)]);
        }

        $interview->forceFill(['stage' => $next])->save();

        $interview->loadMissing('application.employeeProfile.user')
            ->application?->employeeProfile?->user
            ?->notify(new InterviewStageChangedNotification($interview->fresh(['scheduledBy']), $previous, $next));

        return response()->json(['data' => new InterviewResource($interview->fresh())]);
    }

    public function approveReschedule(Request $request, InterviewRescheduleRequest $rescheduleRequest): JsonResponse
    {
        $this->authorizeInterview($request, $rescheduleRequest->interview);

        $data = $request->validate([
            'chosen_slot' => ['required', 'date', 'after:now'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $interview = $this->reschedule->approve(
            $rescheduleRequest,
            $request->user(),
            $data['chosen_slot'],
            $data['note'] ?? null,
        );

        return response()->json(['data' => new InterviewResource($interview->fresh(['participants.user']))]);
    }

    public function rejectReschedule(Request $request, InterviewRescheduleRequest $rescheduleRequest): JsonResponse
    {
        $this->authorizeInterview($request, $rescheduleRequest->interview);

        $data = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        $row = $this->reschedule->reject($rescheduleRequest, $request->user(), $data['note'] ?? null);

        return response()->json(['data' => ['id' => $row->id, 'status' => $row->status]]);
    }

    private function authorizeInterview(Request $request, ?Interview $interview): void
    {
        $company = $this->resolveCompany($request);

        abort_unless(
            $company !== null
                && $interview?->application?->job?->company_id === $company->id,
            403,
        );
    }
}
