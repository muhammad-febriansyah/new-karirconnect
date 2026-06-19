<?php

namespace App\Jobs;

use App\Models\AiInterviewSession;
use App\Notifications\AiInterviewCompletedNotification;
use App\Services\Ai\AiAnswerEvaluatorService;
use App\Services\Ai\AiInterviewAnalysisService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Runs all the expensive AI work for a finished interview off the request
 * thread: scores any not-yet-evaluated answers, generates the session-level
 * analysis, then notifies the employer for real (non-practice) sessions.
 *
 * Kept idempotent and unique-per-session so a retry (or a double "complete"
 * click) re-uses the upserted rows instead of duplicating work.
 */
class FinalizeAiInterviewJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    public function __construct(public int $sessionId) {}

    public function uniqueId(): string
    {
        return (string) $this->sessionId;
    }

    public function handle(
        AiAnswerEvaluatorService $evaluator,
        AiInterviewAnalysisService $analyzer,
    ): void {
        $session = AiInterviewSession::query()->with('questions.response')->find($this->sessionId);

        if ($session === null) {
            return;
        }

        // Score every answered-but-unscored response. Idempotent: questions that
        // were already evaluated (evaluated_at set) are skipped on retries.
        foreach ($session->questions as $question) {
            $response = $question->response;

            if ($response === null || $response->evaluated_at !== null) {
                continue;
            }

            if (! filled($response->answer_text)) {
                continue;
            }

            $evaluator->evaluate($session, $question, $response->answer_text, $response->duration_seconds);
        }

        $analyzer->analyze($session);

        if (! $session->is_practice && $session->job !== null) {
            $session->load(['job.company.owner', 'analysis', 'candidateProfile.user']);
            $owner = $session->job->company?->owner;

            $owner?->notify(new AiInterviewCompletedNotification(
                $session->fresh(['analysis', 'candidateProfile.user', 'job']),
            ));
        }
    }
}
