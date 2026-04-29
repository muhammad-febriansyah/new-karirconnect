<?php

namespace App\Http\Controllers\Employer;

use App\Actions\Interviews\ScheduleInterviewAction;
use App\Enums\InterviewMode;
use App\Enums\InterviewStage;
use App\Enums\InterviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Interviews\ScheduleInterviewRequest;
use App\Http\Requests\Interviews\SubmitScorecardRequest;
use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\Interview;
use App\Services\Interviews\InterviewIcsExporter;
use App\Services\Interviews\InterviewService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class InterviewController extends Controller
{
    public function __construct(
        private readonly ScheduleInterviewAction $schedule,
        private readonly InterviewService $interviews,
        private readonly InterviewIcsExporter $ics,
    ) {}

    public function index(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $statusFilter = $request->string('status')->toString();

        $interviews = Interview::query()
            ->with([
                'application:id,job_id,employee_profile_id',
                'application.job:id,title,slug,company_id',
                'application.employeeProfile.user:id,name,email,avatar_path',
                'scheduledBy:id,name',
            ])
            ->whereHas('application.job', fn ($q) => $q->where('company_id', $company->id))
            ->when($statusFilter !== '', fn ($q) => $q->where('status', $statusFilter))
            ->orderBy('scheduled_at')
            ->get()
            ->map(fn (Interview $i) => $this->cardPayload($i));

        $byStatus = $interviews->groupBy('status');

        return Inertia::render('employer/interviews/index', [
            'columns' => [
                ['key' => 'scheduled', 'label' => 'Terjadwal', 'items' => $byStatus->get('scheduled', collect())->values()],
                ['key' => 'rescheduled', 'label' => 'Rescheduled', 'items' => $byStatus->get('rescheduled', collect())->values()],
                ['key' => 'ongoing', 'label' => 'Berlangsung', 'items' => $byStatus->get('ongoing', collect())->values()],
                ['key' => 'completed', 'label' => 'Selesai', 'items' => $byStatus->get('completed', collect())->values()],
                ['key' => 'cancelled', 'label' => 'Batal/No-Show', 'items' => $byStatus->get('cancelled', collect())->merge($byStatus->get('no_show', collect()))->values()],
            ],
            'filters' => ['status' => $statusFilter],
            'statusOptions' => InterviewStatus::selectItems(),
        ]);
    }

    public function create(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $applicationId = $request->integer('application');
        $application = $applicationId
            ? Application::query()
                ->with(['employeeProfile.user:id,name,email', 'job:id,title,slug,company_id'])
                ->whereHas('job', fn ($q) => $q->where('company_id', $company->id))
                ->find($applicationId)
            : null;

        return Inertia::render('employer/interviews/create', [
            'application' => $application ? [
                'id' => $application->id,
                'candidate_name' => $application->employeeProfile?->user?->name,
                'job' => ['id' => $application->job?->id, 'title' => $application->job?->title],
            ] : null,
            'options' => [
                'stages' => InterviewStage::selectItems(),
                'modes' => InterviewMode::selectItems(),
                'team' => $this->teamOptions($company),
            ],
        ]);
    }

    public function store(ScheduleInterviewRequest $request): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $application = Application::query()
            ->whereHas('job', fn ($q) => $q->where('company_id', $company->id))
            ->findOrFail($request->validated('application_id'));

        $interview = $this->schedule->execute($application, $request->user(), $request->validated());

        return redirect()->route('employer.interviews.show', ['interview' => $interview->id])
            ->with('success', 'Interview berhasil dijadwalkan.');
    }

    public function show(Request $request, Interview $interview): Response
    {
        $this->authorizeInterview($request, $interview);

        $interview->load([
            'application.job:id,title,slug',
            'application.employeeProfile.user:id,name,email',
            'participants.user:id,name,email',
            'scorecards.reviewer:id,name',
            'rescheduleRequests.requestedBy:id,name',
        ]);

        $existingScorecard = $interview->scorecards->firstWhere('reviewer_id', $request->user()->id);

        return Inertia::render('employer/interviews/show', [
            'interview' => [
                'id' => $interview->id,
                'title' => $interview->title,
                'stage' => $interview->stage?->value,
                'mode' => $interview->mode?->value,
                'status' => $interview->status?->value,
                'scheduled_at' => optional($interview->scheduled_at)->toIso8601String(),
                'duration_minutes' => $interview->duration_minutes,
                'timezone' => $interview->timezone,
                'meeting_url' => $interview->meeting_url,
                'meeting_passcode' => $interview->meeting_passcode,
                'location_name' => $interview->location_name,
                'location_address' => $interview->location_address,
                'location_map_url' => $interview->location_map_url,
                'candidate_instructions' => $interview->candidate_instructions,
                'internal_notes' => $interview->internal_notes,
                'application' => [
                    'id' => $interview->application?->id,
                    'job_title' => $interview->application?->job?->title,
                    'job_slug' => $interview->application?->job?->slug,
                    'candidate_name' => $interview->application?->employeeProfile?->user?->name,
                    'candidate_email' => $interview->application?->employeeProfile?->user?->email,
                ],
                'participants' => $interview->participants->map(fn ($p) => [
                    'id' => $p->id,
                    'role' => $p->role,
                    'response' => $p->invitation_response,
                    'attended' => $p->attended,
                    'name' => $p->user?->name,
                    'email' => $p->user?->email,
                ])->values(),
                'reschedule_requests' => $interview->rescheduleRequests->map(fn ($r) => [
                    'id' => $r->id,
                    'reason' => $r->reason,
                    'proposed_slots' => $r->proposed_slots,
                    'status' => $r->status,
                    'requested_by' => $r->requestedBy?->name,
                    'created_at' => optional($r->created_at)->toIso8601String(),
                ])->values(),
                'scorecards' => $interview->scorecards->map(fn ($s) => [
                    'id' => $s->id,
                    'reviewer' => $s->reviewer?->name,
                    'overall_score' => $s->overall_score,
                    'recommendation' => $s->recommendation,
                    'comments' => $s->comments,
                    'submitted_at' => optional($s->submitted_at)->toIso8601String(),
                ])->values(),
            ],
            'myScorecard' => $existingScorecard,
        ]);
    }

    public function cancel(Request $request, Interview $interview): RedirectResponse
    {
        $this->authorizeInterview($request, $interview);

        $this->interviews->cancel($interview, $request->input('note'));

        return back()->with('success', 'Interview dibatalkan.');
    }

    public function complete(Request $request, Interview $interview): RedirectResponse
    {
        $this->authorizeInterview($request, $interview);

        $this->interviews->markCompleted($interview);

        return back()->with('success', 'Interview ditandai selesai.');
    }

    public function storeScorecard(SubmitScorecardRequest $request, Interview $interview): RedirectResponse
    {
        $this->authorizeInterview($request, $interview);

        $interview->scorecards()->updateOrCreate(
            ['reviewer_id' => $request->user()->id],
            [
                ...$request->validated(),
                'submitted_at' => now(),
            ],
        );

        return back()->with('success', 'Scorecard tersimpan.');
    }

    public function downloadIcs(Request $request, Interview $interview): HttpResponse
    {
        $this->authorizeInterview($request, $interview);

        return response($this->ics->export($interview), 200, [
            'Content-Type' => 'text/calendar; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=interview-{$interview->id}.ics",
        ]);
    }

    private function resolveCompany(Request $request): ?Company
    {
        return Company::query()->where('owner_id', $request->user()->id)->first();
    }

    private function authorizeInterview(Request $request, Interview $interview): void
    {
        $company = $this->resolveCompany($request);
        $interview->loadMissing('application.job:id,company_id');

        abort_unless(
            $company !== null && $interview->application?->job?->company_id === $company->id,
            403,
        );
    }

    /**
     * @return array<int, array{value:string,label:string}>
     */
    private function teamOptions(Company $company): array
    {
        return CompanyMember::query()
            ->with('user:id,name,email')
            ->where('company_id', $company->id)
            ->get()
            ->map(fn (CompanyMember $m) => [
                'value' => (string) $m->user_id,
                'label' => trim(($m->user?->name ?? '').' ('.$m->role.')'),
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function cardPayload(Interview $i): array
    {
        return [
            'id' => $i->id,
            'title' => $i->title,
            'stage' => $i->stage?->value,
            'mode' => $i->mode?->value,
            'status' => $i->status?->value,
            'scheduled_at' => optional($i->scheduled_at)->toIso8601String(),
            'candidate_name' => $i->application?->employeeProfile?->user?->name,
            'job_title' => $i->application?->job?->title,
            'job_slug' => $i->application?->job?->slug,
        ];
    }
}
