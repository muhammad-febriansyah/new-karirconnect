<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Interviews\RescheduleInterviewAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\InterviewResource;
use App\Models\Interview;
use App\Models\InterviewParticipant;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * The candidate's side of interviews: see the schedule, confirm attendance,
 * ask to move it.
 */
class InterviewController extends Controller
{
    public function __construct(
        private readonly EmployeeProfileService $profiles,
        private readonly RescheduleInterviewAction $reschedule,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $interviews = Interview::query()
            ->with([
                'application:id,job_id,employee_profile_id',
                'application.job:id,title,slug,company_id',
                'application.job.company:id,name',
                'participants.user:id,name',
            ])
            ->whereHas('application', fn ($query) => $query->where('employee_profile_id', $profile->id))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->boolean('upcoming'), fn ($query) => $query->where('scheduled_at', '>=', now()))
            ->orderBy('scheduled_at')
            ->paginate(min($request->integer('per_page') ?: 20, 50))
            ->withQueryString();

        return InterviewResource::collection($interviews);
    }

    public function show(Request $request, Interview $interview): JsonResponse
    {
        $this->authorizeAsCandidate($request, $interview);

        $interview->load([
            'application.job:id,title,slug,company_id',
            'application.job.company:id,name',
            'participants.user:id,name',
            'rescheduleRequests',
        ]);

        return response()->json([
            'data' => new InterviewResource($interview),
            'meta' => [
                'reschedule_requests' => $interview->rescheduleRequests->map(fn ($row) => [
                    'id' => $row->id,
                    'status' => $row->status,
                    'reason' => $row->reason,
                    'proposed_slots' => $row->proposed_slots,
                    'created_at' => $row->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }

    /**
     * Accept, decline, or tentatively hold the invitation.
     */
    public function respond(Request $request, Interview $interview): JsonResponse
    {
        $participant = $this->candidateParticipant($request, $interview);

        abort_unless($participant !== null, 403);

        $data = $request->validate([
            'response' => ['required', Rule::in(['accepted', 'declined', 'tentative'])],
        ]);

        $participant->forceFill([
            'invitation_response' => $data['response'],
            'responded_at' => now(),
        ])->save();

        // Accepting is what confirms the interview, and only the first accept
        // sets it -- re-accepting must not move the timestamp.
        if ($data['response'] === 'accepted' && $interview->confirmed_at === null) {
            $interview->forceFill(['confirmed_at' => now()])->save();
        }

        return response()->json([
            'data' => new InterviewResource($interview->fresh(['participants.user'])),
        ]);
    }

    public function requestReschedule(Request $request, Interview $interview): JsonResponse
    {
        $this->authorizeAsCandidate($request, $interview);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
            'proposed_slots' => ['required', 'array', 'min:1', 'max:5'],
            'proposed_slots.*' => ['date', 'after:now'],
        ]);

        $requestRow = $this->reschedule->request(
            $interview,
            $request->user(),
            $data['reason'],
            $data['proposed_slots'],
        );

        return response()->json([
            'message' => 'Permintaan reschedule terkirim ke recruiter.',
            'data' => [
                'id' => $requestRow->id,
                'status' => $requestRow->status,
                'proposed_slots' => $requestRow->proposed_slots,
            ],
        ], 201);
    }

    private function authorizeAsCandidate(Request $request, Interview $interview): void
    {
        $profile = $this->profiles->ensureProfile($request->user());

        abort_unless($interview->application?->employee_profile_id === $profile->id, 403);
    }

    private function candidateParticipant(Request $request, Interview $interview): ?InterviewParticipant
    {
        $this->authorizeAsCandidate($request, $interview);

        return $interview->participants()
            ->where('user_id', $request->user()->id)
            ->first();
    }
}
