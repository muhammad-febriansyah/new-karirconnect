<?php

namespace App\Http\Controllers\Employer;

use App\Actions\Interviews\ScheduleInterviewAction;
use App\Enums\InterviewMode;
use App\Enums\InterviewStage;
use App\Enums\InterviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Interviews\BulkScheduleInterviewRequest;
use App\Http\Requests\Interviews\ScheduleInterviewRequest;
use App\Http\Requests\Interviews\SubmitScorecardRequest;
use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\Interview;
use App\Services\Interviews\InterviewIcsExporter;
use App\Services\Interviews\InterviewService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

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
        $groupBy = $request->string('group_by')->toString() === 'status' ? 'status' : 'stage';

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

        $columns = $groupBy === 'status'
            ? $this->groupByStatus($interviews)
            : $this->groupByStage($interviews);

        return Inertia::render('employer/interviews/index', [
            'columns' => $columns,
            'filters' => ['status' => $statusFilter, 'group_by' => $groupBy],
            'statusOptions' => InterviewStatus::selectItems(),
            'stageOptions' => InterviewStage::selectItems(),
        ]);
    }

    public function changeStage(Request $request, Interview $interview): RedirectResponse
    {
        $this->authorizeInterview($request, $interview);

        $data = $request->validate([
            'stage' => ['required', 'string', 'in:'.implode(',', array_column(InterviewStage::cases(), 'value'))],
        ]);

        $interview->forceFill(['stage' => $data['stage']])->save();

        return back()->with('success', 'Tahap interview diperbarui.');
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

    /**
     * Bulk schedule form. Lists all interview-able applications under the
     * employer's company so the recruiter can multi-select candidates and
     * schedule everyone in one go.
     */
    public function bulkCreate(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $applications = Application::query()
            ->with([
                'employeeProfile.user:id,name,email,avatar_path',
                'job:id,title,slug,company_id',
            ])
            ->whereHas('job', fn ($q) => $q->where('company_id', $company->id))
            ->whereNotIn('status', ['rejected', 'withdrawn', 'hired'])
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(function (Application $app) {
                $avatarPath = $app->employeeProfile?->user?->avatar_path;
                $avatarUrl = $avatarPath
                    ? rtrim((string) config('app.url'), '/').'/storage/'.ltrim((string) $avatarPath, '/')
                    : null;

                return [
                    'id' => $app->id,
                    'candidate_name' => $app->employeeProfile?->user?->name,
                    'candidate_email' => $app->employeeProfile?->user?->email,
                    'candidate_avatar_url' => $avatarUrl,
                    'job_id' => $app->job?->id,
                    'job_title' => $app->job?->title,
                    'status' => $app->status?->value,
                    'current_stage' => $app->current_stage?->value,
                ];
            })
            ->values();

        return Inertia::render('employer/interviews/bulk', [
            'applications' => $applications,
            'options' => [
                'stages' => InterviewStage::selectItems(),
                'modes' => InterviewMode::selectItems(),
                'team' => $this->teamOptions($company),
            ],
            'preselected_ids' => $request->collect('application_ids')
                ->map(fn ($v) => (int) $v)
                ->filter()
                ->values()
                ->all(),
        ]);
    }

    /**
     * Schedule the same template across many applications. Two modes:
     *  - Sequential: each candidate gets a slot at start + (i * (duration + gap))
     *  - Group: every candidate sits in the same slot at start_at
     *
     * Each ScheduleInterviewAction call runs in its own transaction. If one
     * candidate fails (slot conflict, missing profile, etc.) we collect the
     * failure and continue with the rest — the recruiter sees a per-row report
     * at the end so partial success is still useful.
     */
    public function bulkStore(BulkScheduleInterviewRequest $request): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $data = $request->validated();
        $timezone = $data['timezone'] ?? 'Asia/Jakarta';
        $start = Carbon::parse($data['start_at'], $timezone);
        $duration = (int) $data['duration_minutes'];
        $gap = (int) $data['gap_minutes'];
        $groupMode = (bool) $data['group_mode'];

        $applications = Application::query()
            ->with(['employeeProfile.user:id,name'])
            ->whereHas('job', fn ($q) => $q->where('company_id', $company->id))
            ->whereIn('id', $data['application_ids'])
            ->get()
            ->keyBy('id');

        $missing = collect($data['application_ids'])
            ->reject(fn (int $id) => $applications->has($id))
            ->values();

        if ($missing->isNotEmpty()) {
            throw ValidationException::withMessages([
                'application_ids' => 'Beberapa lamaran tidak ditemukan atau bukan milik perusahaan ini.',
            ]);
        }

        $succeeded = [];
        $failed = [];

        foreach (array_values((array) $data['application_ids']) as $index => $appId) {
            $application = $applications->get((int) $appId);
            if (! $application) {
                continue;
            }

            $slotStart = $groupMode
                ? $start->copy()
                : $start->copy()->addMinutes($index * ($duration + $gap));

            $payload = [
                'stage' => $data['stage'],
                'mode' => $data['mode'],
                'title' => $data['title'],
                'scheduled_at' => $slotStart->toIso8601String(),
                'duration_minutes' => $duration,
                'timezone' => $timezone,
                'candidate_instructions' => $data['candidate_instructions'] ?? null,
                'internal_notes' => $data['internal_notes'] ?? null,
                'requires_confirmation' => $data['requires_confirmation'] ?? true,
                'meeting_url' => $data['meeting_url'] ?? null,
                'meeting_passcode' => $data['meeting_passcode'] ?? null,
                'location_name' => $data['location_name'] ?? null,
                'location_address' => $data['location_address'] ?? null,
                'location_map_url' => $data['location_map_url'] ?? null,
                'interviewer_ids' => $data['interviewer_ids'] ?? [],
            ];

            try {
                $interview = $this->schedule->execute($application, $request->user(), $payload);
                $succeeded[] = [
                    'id' => $interview->id,
                    'candidate' => $application->employeeProfile?->user?->name ?? 'Kandidat',
                    'scheduled_at' => $slotStart->toIso8601String(),
                ];
            } catch (ValidationException $e) {
                $failed[] = [
                    'application_id' => $application->id,
                    'candidate' => $application->employeeProfile?->user?->name ?? 'Kandidat',
                    'reason' => collect($e->errors())->flatten()->first() ?? 'Gagal dijadwalkan.',
                ];
            } catch (Throwable $e) {
                $failed[] = [
                    'application_id' => $application->id,
                    'candidate' => $application->employeeProfile?->user?->name ?? 'Kandidat',
                    'reason' => 'Kesalahan tak terduga: '.$e->getMessage(),
                ];
            }
        }

        $message = sprintf(
            '%d interview berhasil dijadwalkan%s.',
            count($succeeded),
            count($failed) > 0 ? sprintf(', %d gagal', count($failed)) : '',
        );

        $session = [
            count($failed) === 0 ? 'success' : 'warning' => $message,
            'bulk_result' => [
                'succeeded' => $succeeded,
                'failed' => $failed,
            ],
        ];

        if (count($succeeded) === 0) {
            return back()->withInput()->with('error', 'Tidak ada interview yang berhasil dijadwalkan.')
                ->with('bulk_result', ['succeeded' => $succeeded, 'failed' => $failed]);
        }

        return redirect()->route('employer.interviews.index')->with($session);
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
            'stage_label' => $i->stage?->label(),
            'mode' => $i->mode?->value,
            'status' => $i->status?->value,
            'scheduled_at' => optional($i->scheduled_at)->toIso8601String(),
            'candidate_name' => $i->application?->employeeProfile?->user?->name,
            'job_title' => $i->application?->job?->title,
            'job_slug' => $i->application?->job?->slug,
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $interviews
     * @return array<int, array{key:string, label:string, items:array<int, array<string, mixed>>}>
     */
    private function groupByStage($interviews): array
    {
        $byStage = $interviews->groupBy('stage');

        return collect(InterviewStage::cases())
            ->map(fn (InterviewStage $stage) => [
                'key' => $stage->value,
                'label' => $stage->label(),
                'items' => $byStage->get($stage->value, collect())->values()->all(),
            ])
            ->all();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $interviews
     * @return array<int, array{key:string, label:string, items:array<int, array<string, mixed>>}>
     */
    private function groupByStatus($interviews): array
    {
        $byStatus = $interviews->groupBy('status');

        return [
            ['key' => 'scheduled', 'label' => 'Terjadwal', 'items' => $byStatus->get('scheduled', collect())->values()->all()],
            ['key' => 'rescheduled', 'label' => 'Rescheduled', 'items' => $byStatus->get('rescheduled', collect())->values()->all()],
            ['key' => 'ongoing', 'label' => 'Berlangsung', 'items' => $byStatus->get('ongoing', collect())->values()->all()],
            ['key' => 'completed', 'label' => 'Selesai', 'items' => $byStatus->get('completed', collect())->values()->all()],
            ['key' => 'cancelled', 'label' => 'Batal/No-Show', 'items' => $byStatus->get('cancelled', collect())->merge($byStatus->get('no_show', collect()))->values()->all()],
        ];
    }
}
