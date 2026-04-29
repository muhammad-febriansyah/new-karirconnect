<?php

namespace App\Http\Controllers\Employee;

use App\Actions\Interviews\RescheduleInterviewAction;
use App\Http\Controllers\Controller;
use App\Models\Interview;
use App\Models\InterviewParticipant;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InterviewController extends Controller
{
    public function __construct(
        private readonly EmployeeProfileService $profiles,
        private readonly RescheduleInterviewAction $reschedule,
    ) {}

    public function index(Request $request): Response
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $interviews = Interview::query()
            ->with(['application.job:id,title,slug,company_id', 'application.job.company:id,name,slug', 'scheduledBy:id,name'])
            ->whereHas('application', fn ($q) => $q->where('employee_profile_id', $profile->id))
            ->orderBy('scheduled_at')
            ->get()
            ->map(fn (Interview $i) => [
                'id' => $i->id,
                'title' => $i->title,
                'stage' => $i->stage?->value,
                'mode' => $i->mode?->value,
                'status' => $i->status?->value,
                'scheduled_at' => optional($i->scheduled_at)->toIso8601String(),
                'duration_minutes' => $i->duration_minutes,
                'meeting_url' => $i->meeting_url,
                'job' => [
                    'title' => $i->application?->job?->title,
                    'slug' => $i->application?->job?->slug,
                ],
                'company' => [
                    'name' => $i->application?->job?->company?->name,
                    'slug' => $i->application?->job?->company?->slug,
                ],
            ]);

        return Inertia::render('employee/interviews/index', [
            'interviews' => $interviews,
        ]);
    }

    public function show(Request $request, Interview $interview): Response
    {
        $this->authorizeAsCandidate($request, $interview);

        $interview->load([
            'application.job:id,title,slug',
            'application.job.company:id,name,slug',
            'participants.user:id,name,email',
            'rescheduleRequests',
            'scheduledBy:id,name',
        ]);

        return Inertia::render('employee/interviews/show', [
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
                'job' => [
                    'title' => $interview->application?->job?->title,
                    'slug' => $interview->application?->job?->slug,
                ],
                'company' => [
                    'name' => $interview->application?->job?->company?->name,
                ],
                'reschedule_requests' => $interview->rescheduleRequests->map(fn ($r) => [
                    'id' => $r->id,
                    'status' => $r->status,
                    'reason' => $r->reason,
                    'proposed_slots' => $r->proposed_slots,
                    'created_at' => optional($r->created_at)->toIso8601String(),
                ])->values(),
                'my_response' => $this->candidateParticipant($interview, $request)?->invitation_response,
            ],
        ]);
    }

    public function respond(Request $request, Interview $interview): RedirectResponse
    {
        $participant = $this->candidateParticipant($interview, $request);
        abort_unless($participant !== null, 403);

        $data = $request->validate([
            'response' => ['required', Rule::in(['accepted', 'declined', 'tentative'])],
        ]);

        $participant->forceFill([
            'invitation_response' => $data['response'],
            'responded_at' => now(),
        ])->save();

        if ($data['response'] === 'accepted' && $interview->confirmed_at === null) {
            $interview->forceFill(['confirmed_at' => now()])->save();
        }

        return back()->with('success', 'Respons interview tersimpan.');
    }

    public function requestReschedule(Request $request, Interview $interview): RedirectResponse
    {
        $this->authorizeAsCandidate($request, $interview);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
            'proposed_slots' => ['required', 'array', 'min:1', 'max:5'],
            'proposed_slots.*' => ['date', 'after:now'],
        ]);

        $this->reschedule->request($interview, $request->user(), $data['reason'], $data['proposed_slots']);

        return back()->with('success', 'Permintaan reschedule terkirim ke recruiter.');
    }

    private function authorizeAsCandidate(Request $request, Interview $interview): void
    {
        $profile = $this->profiles->ensureProfile($request->user());
        abort_unless($interview->application?->employee_profile_id === $profile->id, 403);
    }

    private function candidateParticipant(Interview $interview, Request $request): ?InterviewParticipant
    {
        return $interview->participants()
            ->where('user_id', $request->user()->id)
            ->where('role', 'candidate')
            ->first();
    }
}
