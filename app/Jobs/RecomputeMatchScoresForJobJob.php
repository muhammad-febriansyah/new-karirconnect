<?php

namespace App\Jobs;

use App\Models\Application;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Fan out match-score recomputes for every application attached to a job.
 * Useful after the employer edits skills, salary, or location filters.
 */
class RecomputeMatchScoresForJobJob implements ShouldQueue
{
    use Batchable, Queueable;

    public int $tries = 2;

    public function __construct(public readonly int $jobId) {}

    public function handle(): void
    {
        Application::query()
            ->where('job_id', $this->jobId)
            ->select('id')
            ->cursor()
            ->each(function (Application $application): void {
                SyncApplicationMatchScoreJob::dispatch($application->id);
            });
    }
}
