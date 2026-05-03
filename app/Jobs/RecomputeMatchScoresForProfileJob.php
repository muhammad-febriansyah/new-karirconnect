<?php

namespace App\Jobs;

use App\Models\Application;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Fan out match-score recomputes for every application a candidate has open.
 * Useful after the candidate edits skills, expected salary, or location.
 */
class RecomputeMatchScoresForProfileJob implements ShouldQueue
{
    use Batchable, Queueable;

    public int $tries = 2;

    public function __construct(public readonly int $employeeProfileId) {}

    public function handle(): void
    {
        Application::query()
            ->where('employee_profile_id', $this->employeeProfileId)
            ->select('id')
            ->cursor()
            ->each(function (Application $application): void {
                SyncApplicationMatchScoreJob::dispatch($application->id);
            });
    }
}
