<?php

namespace App\Services\Applications;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\Job;
use App\Services\Jobs\JobMatchingService;

class ApplicationService
{
    public function __construct(private readonly JobMatchingService $matcher) {}

    /**
     * Recompute and persist the AI/rule match score for a single application.
     * Sprint 7 will swap the underlying scorer with the AI variant; the contract
     * is intentionally narrow so the caller doesn't care which engine ran.
     */
    public function syncMatchScore(Application $application): Application
    {
        $application->loadMissing(['job.skills:id', 'job.city:id,province_id', 'employeeProfile.skills:id', 'employeeProfile.city:id,province_id']);

        if ($application->job === null || $application->employeeProfile === null) {
            return $application;
        }

        $score = $this->matcher->score($application->job, $application->employeeProfile);
        $application->forceFill(['ai_match_score' => $score])->save();

        return $application;
    }

    /**
     * Bump applications_count cache on the job. Called whenever an application is
     * created — cheaper than a count() in the index and visible on browse cards.
     */
    public function incrementJobCounter(Job $job): void
    {
        $job->newQuery()->whereKey($job->id)->increment('applications_count');
    }

    public function markReviewed(Application $application): Application
    {
        if ($application->status === ApplicationStatus::Submitted) {
            $application->forceFill([
                'status' => ApplicationStatus::Reviewed,
                'reviewed_at' => now(),
            ])->save();
        }

        return $application;
    }
}
