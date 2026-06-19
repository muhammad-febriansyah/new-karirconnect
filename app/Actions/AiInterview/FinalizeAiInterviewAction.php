<?php

namespace App\Actions\AiInterview;

use App\Enums\AiInterviewStatus;
use App\Jobs\FinalizeAiInterviewJob;
use App\Models\AiInterviewSession;

class FinalizeAiInterviewAction
{
    /**
     * Close out the interview and hand the heavy AI work (per-answer scoring,
     * final analysis, employer notification) to a queued job so the candidate
     * gets an instant response instead of blocking on several model calls.
     *
     * Under the sync queue driver (tests) the job runs inline, so the analysis
     * is available immediately on return. In production the session sits in
     * `analyzing` until the worker finishes and the result page polls for it.
     */
    public function execute(AiInterviewSession $session): AiInterviewSession
    {
        if ($session->status === AiInterviewStatus::Completed && $session->analysis()->exists()) {
            return $session->fresh(['analysis', 'questions.response']);
        }

        $startedAt = $session->started_at;

        $session->forceFill([
            'status' => AiInterviewStatus::Analyzing,
            'duration_seconds' => $startedAt
                ? max(0, now()->diffInSeconds($startedAt))
                : $session->duration_seconds,
        ])->save();

        FinalizeAiInterviewJob::dispatch($session->id);

        return $session->fresh(['analysis', 'questions.response']);
    }
}
