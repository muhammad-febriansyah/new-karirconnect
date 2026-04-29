<?php

namespace App\Services\Interviews;

use App\Enums\InterviewStatus;
use App\Models\Interview;

class InterviewService
{
    public function cancel(Interview $interview, ?string $note = null): Interview
    {
        $interview->forceFill([
            'status' => InterviewStatus::Cancelled,
            'internal_notes' => $note ? trim(($interview->internal_notes ?? '')."\n[CANCELLED] {$note}") : $interview->internal_notes,
        ])->save();

        return $interview;
    }

    public function markCompleted(Interview $interview): Interview
    {
        $interview->forceFill(['status' => InterviewStatus::Completed])->save();

        return $interview;
    }

    public function markNoShow(Interview $interview): Interview
    {
        $interview->forceFill(['status' => InterviewStatus::NoShow])->save();

        return $interview;
    }

    public function markOngoing(Interview $interview): Interview
    {
        $interview->forceFill(['status' => InterviewStatus::Ongoing])->save();

        return $interview;
    }
}
