<?php

namespace App\Jobs;

use App\Models\AiInterviewSession;
use App\Notifications\AiInterviewCompletedNotification;
use App\Services\Ai\AiInterviewAnalysisService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Run the heavy AI analysis on a finalized session off the request thread,
 * then notify the employer when the analysis lands.
 */
class AnalyzeAiInterviewJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 120;

    public function __construct(public readonly int $sessionId) {}

    public function handle(AiInterviewAnalysisService $analyzer): void
    {
        $session = AiInterviewSession::query()->find($this->sessionId);

        if ($session === null) {
            return;
        }

        $analyzer->analyze($session);

        if ($session->is_practice || $session->job === null) {
            return;
        }

        $session->load(['job.company.owner', 'analysis', 'candidateProfile.user']);
        $owner = $session->job->company?->owner;

        $owner?->notify(new AiInterviewCompletedNotification(
            $session->fresh(['analysis', 'candidateProfile.user', 'job']),
        ));
    }
}
