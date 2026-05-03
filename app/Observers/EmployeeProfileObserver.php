<?php

namespace App\Observers;

use App\Jobs\RecomputeMatchScoresForProfileJob;
use App\Models\EmployeeProfile;

class EmployeeProfileObserver
{
    /**
     * Match-score inputs we watch on the profile side. When any of these
     * change for a profile that has open applications, fan out a recompute.
     * Symmetric with JobObserver::MATCH_RELEVANT_FIELDS so the score stays
     * fresh from either direction.
     */
    private const MATCH_RELEVANT_FIELDS = [
        'experience_level',
        'expected_salary_min',
        'expected_salary_max',
        'city_id',
        'province_id',
    ];

    public function updated(EmployeeProfile $profile): void
    {
        if (! $profile->wasChanged(self::MATCH_RELEVANT_FIELDS)) {
            return;
        }

        if (! $profile->applications()->exists()) {
            return;
        }

        RecomputeMatchScoresForProfileJob::dispatch($profile->id);
    }
}
