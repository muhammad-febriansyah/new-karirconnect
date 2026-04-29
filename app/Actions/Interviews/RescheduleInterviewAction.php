<?php

namespace App\Actions\Interviews;

use App\Enums\InterviewStatus;
use App\Models\Interview;
use App\Models\InterviewRescheduleRequest;
use App\Models\User;
use App\Notifications\InterviewRescheduledNotification;
use App\Services\Interviews\InterviewSchedulingService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RescheduleInterviewAction
{
    public function __construct(private readonly InterviewSchedulingService $scheduler) {}

    /**
     * Candidate-initiated reschedule request. Stores the request — does not
     * mutate the interview itself; the employer reviews and approves separately.
     *
     * @param  array<int, string>  $proposedSlots  ISO-8601 timestamps
     */
    public function request(Interview $interview, User $requester, string $reason, array $proposedSlots): InterviewRescheduleRequest
    {
        if ($proposedSlots === []) {
            throw ValidationException::withMessages(['proposed_slots' => 'Minimal satu slot pengganti wajib diberikan.']);
        }

        return InterviewRescheduleRequest::query()->create([
            'interview_id' => $interview->id,
            'requested_by_user_id' => $requester->id,
            'reason' => $reason,
            'proposed_slots' => $proposedSlots,
            'status' => 'pending',
        ]);
    }

    /**
     * Employer approves a reschedule with a chosen slot. Moves the interview
     * to the new time, sets status=rescheduled, notifies the candidate.
     */
    public function approve(
        InterviewRescheduleRequest $request,
        User $approver,
        string $chosenSlot,
        ?string $note = null,
    ): Interview {
        $newStart = Carbon::parse($chosenSlot, $request->interview?->timezone ?? 'Asia/Jakarta');

        return DB::transaction(function () use ($request, $approver, $newStart, $note): Interview {
            $interview = $request->interview;
            $duration = $interview->duration_minutes ?? 60;

            $participantIds = $interview->participants()->pluck('user_id')->all();
            $conflicts = $this->scheduler->findConflicts($newStart, $duration, $participantIds, $interview->id);
            if ($conflicts->isNotEmpty()) {
                throw ValidationException::withMessages(['chosen_slot' => 'Slot baru bentrok dengan jadwal lain.']);
            }

            $interview->forceFill([
                'scheduled_at' => $newStart,
                'ends_at' => $newStart->copy()->addMinutes($duration),
                'status' => InterviewStatus::Rescheduled,
                'confirmed_at' => null,
                'reminder_sent_at' => null,
            ])->save();

            $request->forceFill([
                'status' => 'approved',
                'reviewed_by_user_id' => $approver->id,
                'reviewed_at' => now(),
                'decision_note' => $note,
            ])->save();

            $candidate = $interview->application?->employeeProfile?->user;
            $candidate?->notify(new InterviewRescheduledNotification($interview->fresh()));

            return $interview->fresh();
        });
    }

    public function reject(InterviewRescheduleRequest $request, User $approver, ?string $note = null): InterviewRescheduleRequest
    {
        $request->forceFill([
            'status' => 'rejected',
            'reviewed_by_user_id' => $approver->id,
            'reviewed_at' => now(),
            'decision_note' => $note,
        ])->save();

        return $request;
    }
}
