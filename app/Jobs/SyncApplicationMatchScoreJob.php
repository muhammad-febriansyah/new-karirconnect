<?php

namespace App\Jobs;

use App\Models\Application;
use App\Services\Applications\ApplicationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Recompute the match score for a single application off the request thread.
 * Triggered by job/profile updates so the UI never blocks on AI scoring.
 */
class SyncApplicationMatchScoreJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public readonly int $applicationId) {}

    public function handle(ApplicationService $applications): void
    {
        $application = Application::query()->find($this->applicationId);

        if ($application === null) {
            return;
        }

        $applications->syncMatchScore($application);
    }
}
