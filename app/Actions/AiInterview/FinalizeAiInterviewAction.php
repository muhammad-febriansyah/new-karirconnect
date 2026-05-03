<?php

namespace App\Actions\AiInterview;

use App\Enums\AiInterviewStatus;
use App\Models\AiInterviewSession;
use App\Notifications\AiInterviewCompletedNotification;
use App\Services\Ai\AiInterviewAnalysisService;
use Illuminate\Support\Facades\DB;

class FinalizeAiInterviewAction
{
    public function __construct(private readonly AiInterviewAnalysisService $analyzer) {}

    /**
     * Mark a session complete, generate the final analysis, and notify the
     * employer when the session is tied to a real application (not practice).
     */
    public function execute(AiInterviewSession $session): AiInterviewSession
    {
        if ($session->status === AiInterviewStatus::Completed && $session->analysis()->exists()) {
            return $session->fresh(['analysis', 'questions.response']);
        }

        return DB::transaction(function () use ($session): AiInterviewSession {
            $startedAt = $session->started_at;

            $session->forceFill([
                'status' => AiInterviewStatus::Completed,
                'completed_at' => $session->completed_at ?? now(),
                'duration_seconds' => $startedAt
                    ? max(0, now()->diffInSeconds($startedAt))
                    : $session->duration_seconds,
            ])->save();

            $this->analyzer->analyze($session);

            if (! $session->is_practice && $session->job !== null) {
                $session->load(['job.company.owner', 'analysis', 'candidateProfile.user']);
                $owner = $session->job->company?->owner;

                $owner?->notify(new AiInterviewCompletedNotification(
                    $session->fresh(['analysis', 'candidateProfile.user', 'job']),
                ));
            }

            return $session->fresh(['analysis', 'questions.response']);
        });
    }
}
