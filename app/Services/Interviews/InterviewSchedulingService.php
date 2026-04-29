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
            ->where(function ($q) use ($start, $end): void {
                $q->whereBetween('scheduled_at', [$start, $end])
                    ->orWhereBetween('ends_at', [$start, $end])
                    ->orWhere(function ($q2) use ($start, $end): void {
                        $q2->where('scheduled_at', '<=', $start)
                            ->where('ends_at', '>=', $end);
                    });
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
