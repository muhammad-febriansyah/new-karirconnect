<?php

namespace App\Services\Employee;

use App\Models\EmployeeProfile;
use App\Models\User;

class EmployeeProfileService
{
    /**
     * Lazily resolve (or create) an empty profile for the given user.
     */
    public function ensureProfile(User $user): EmployeeProfile
    {
        return $user->employeeProfile()->firstOrCreate([]);
    }

    /**
     * Recompute the profile_completion percentage based on filled fields and
     * presence of supporting records (education, experience, skills, CV).
     * Idempotent — safe to call after every profile mutation.
     */
    public function recomputeCompletion(EmployeeProfile $profile): int
    {
        $profile->loadMissing(['educations', 'workExperiences', 'skills', 'cvs']);

        $score = 0;

        // Identitas dasar (40)
        if (filled($profile->headline)) {
            $score += 10;
        }
        if (filled($profile->about)) {
            $score += 10;
        }
        if (filled($profile->date_of_birth)) {
            $score += 5;
        }
        if (filled($profile->city_id)) {
            $score += 5;
        }
        if (filled($profile->current_position)) {
            $score += 5;
        }
        if (filled($profile->experience_level)) {
            $score += 5;
        }

        // Records (40)
        if ($profile->educations->isNotEmpty()) {
            $score += 15;
        }
        if ($profile->workExperiences->isNotEmpty()) {
            $score += 15;
        }
        if ($profile->skills->count() >= 3) {
            $score += 10;
        } elseif ($profile->skills->isNotEmpty()) {
            $score += 5;
        }

        // Salary expectation (10)
        if (filled($profile->expected_salary_min) || filled($profile->expected_salary_max)) {
            $score += 10;
        }

        // CV (10)
        if ($profile->cvs->isNotEmpty()) {
            $score += 10;
        }

        $score = min($score, 100);

        if ($profile->profile_completion !== $score) {
            $profile->forceFill(['profile_completion' => $score])->save();
        }

        return $score;
    }
}
