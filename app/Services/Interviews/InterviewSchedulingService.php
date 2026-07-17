<?php

namespace App\Services\Interviews;

use App\Enums\InterviewStatus;
use App\Models\Interview;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;

class InterviewSchedulingService
{
    /**
     * Detect overlap with existing scheduled/ongoing/rescheduled interviews
     * for the given participants. Returns the conflicting interviews, or an
     * empty collection if the slot is free.
     *
     * @param  array<int, int>  $participantUserIds
     * @return Collection<int, Interview>
     */
    public function findConflicts(
        CarbonInterface $start,
        int $durationMinutes,
        array $participantUserIds,
        ?int $ignoreInterviewId = null,
    ): Collection {
        $end = $start->copy()->addMinutes($durationMinutes);

        return Interview::query()
            ->whereIn('status', [InterviewStatus::Scheduled, InterviewStatus::Rescheduled, InterviewStatus::Ongoing])
            ->when($ignoreInterviewId, fn ($q, $id) => $q->where('id', '!=', $id))
            /*
             * Half-open overlap: [start, end) vs [scheduled_at, ends_at).
             *
             * The three whereBetween clauses this replaces were inclusive at
             * both ends, and ends_at is written as exactly start + duration
             * (ScheduleInterviewAction). So a 09:00-10:00 interview made 10:00
             * onwards unbookable -- its ends_at of 10:00 sat inside the new
             * slot's closed range and counted as a conflict. Back-to-back
             * rounds, the normal way an interview day is run, were rejected as
             * "Slot bentrok". Touching endpoints are not an overlap.
             *
             * Assumes ends_at is always populated. The column is nullable, but
             * all three writers (ScheduleInterviewAction, RescheduleInterview-
             * Action, InterviewFactory) set it to start + duration. A NULL here
             * would silently drop the row from conflict detection, so anything
             * that starts writing interviews must keep setting it.
             */
            ->where(function ($q) use ($start, $end): void {
                $q->where('scheduled_at', '<', $end)
                    ->where('ends_at', '>', $start);
            })
            ->whereHas('participants', fn ($q) => $q->whereIn('user_id', $participantUserIds))
            ->get();
    }

    /**
     * Quick boolean check intended for FormRequest validation rules.
     */
    public function hasConflict(
        User $user,
        CarbonInterface $start,
        int $durationMinutes,
        ?int $ignoreInterviewId = null,
    ): bool {
        return $this->findConflicts($start, $durationMinutes, [$user->id], $ignoreInterviewId)->isNotEmpty();
    }
}
