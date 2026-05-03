<?php

namespace App\Services\Jobs;

use App\Enums\ExperienceLevel;
use App\Models\AiMatchScore;
use App\Models\EmployeeProfile;
use App\Models\Job;
use Illuminate\Support\Collection;

/**
 * Rule-based scoring 0-100. Sprint 7 layers AI on top — keeping the contract
 * stable here so the AI service can produce a delta against this baseline.
 *
 * Weights (sum 100):
 *   skills    : 50  (overlap of required + desirable skills)
 *   experience: 20  (level distance: 0=match, 1 step=12pts, 2+=0)
 *   location  : 15  (same city=15, same province=10, remote-ok=15, none=0)
 *   salary    : 15  (overlap between candidate expected & job range)
 */
class JobMatchingService
{
    public function score(Job $job, EmployeeProfile $profile): int
    {
        return $this->breakdown($job, $profile)['score'];
    }

    /**
     * Compute the score plus per-component breakdown. Used by the cache writer
     * and by employer-facing UI that needs to explain the score.
     *
     * @return array{score:int, breakdown:array{skills:int,experience:int,location:int,salary:int}}
     */
    public function breakdown(Job $job, EmployeeProfile $profile): array
    {
        $job->loadMissing('skills:id', 'city:id,province_id');
        $profile->loadMissing('skills:id', 'city:id,province_id');

        $skill = $this->scoreSkills($job, $profile);
        $exp = $this->scoreExperience($job, $profile);
        $loc = $this->scoreLocation($job, $profile);
        $sal = $this->scoreSalary($job, $profile);

        return [
            'score' => min(100, $skill + $exp + $loc + $sal),
            'breakdown' => [
                'skills' => $skill,
                'experience' => $exp,
                'location' => $loc,
                'salary' => $sal,
            ],
        ];
    }

    /**
     * Compute and persist to ai_match_scores. Used to seed talent search and
     * employer dashboards without recomputing on every visit (Blueprint §25.2).
     */
    public function cache(Job $job, EmployeeProfile $profile): AiMatchScore
    {
        $payload = $this->breakdown($job, $profile);

        return AiMatchScore::query()->updateOrCreate(
            ['job_id' => $job->id, 'candidate_profile_id' => $profile->id],
            [
                'score' => $payload['score'],
                'breakdown' => $payload['breakdown'],
                'computed_at' => now(),
            ],
        );
    }

    /**
     * Batch scoring: returns map of job_id → score for the given profile.
     *
     * @param  Collection<int, Job>  $jobs
     * @return array<int, int>
     */
    public function scoreMany(Collection $jobs, EmployeeProfile $profile): array
    {
        return $jobs->mapWithKeys(fn (Job $job) => [$job->id => $this->score($job, $profile)])->all();
    }

    private function scoreSkills(Job $job, EmployeeProfile $profile): int
    {
        $jobSkillIds = $job->skills->pluck('id')->all();
        if (count($jobSkillIds) === 0) {
            return 25;
        }

        $candidateSkillIds = $profile->skills->pluck('id')->all();
        $overlap = count(array_intersect($jobSkillIds, $candidateSkillIds));

        return (int) round(($overlap / count($jobSkillIds)) * 50);
    }

    private function scoreExperience(Job $job, EmployeeProfile $profile): int
    {
        if ($job->experience_level === null || $profile->experience_level === null) {
            return 10;
        }

        $order = [
            ExperienceLevel::Entry->value,
            ExperienceLevel::Junior->value,
            ExperienceLevel::Mid->value,
            ExperienceLevel::Senior->value,
            ExperienceLevel::Lead->value,
            ExperienceLevel::Executive->value,
        ];

        $jobIdx = array_search($job->experience_level->value, $order, true);
        $candIdx = array_search($profile->experience_level instanceof ExperienceLevel
            ? $profile->experience_level->value
            : $profile->experience_level, $order, true);

        if ($jobIdx === false || $candIdx === false) {
            return 10;
        }

        $diff = abs($jobIdx - $candIdx);

        return match (true) {
            $diff === 0 => 20,
            $diff === 1 => 12,
            default => 0,
        };
    }

    private function scoreLocation(Job $job, EmployeeProfile $profile): int
    {
        if ($job->work_arrangement?->value === 'remote') {
            return 15;
        }

        if ($job->city_id === null) {
            return 7;
        }

        if ($profile->city_id === $job->city_id) {
            return 15;
        }

        if ($profile->city?->province_id === $job->city?->province_id) {
            return 10;
        }

        return 0;
    }

    private function scoreSalary(Job $job, EmployeeProfile $profile): int
    {
        if ($job->salary_min === null || $profile->expected_salary_min === null) {
            return 7;
        }

        $jobMax = $job->salary_max ?? $job->salary_min * 1.3;
        $candMin = $profile->expected_salary_min;
        $candMax = $profile->expected_salary_max ?? $candMin * 1.3;

        $overlapStart = max($job->salary_min, $candMin);
        $overlapEnd = min($jobMax, $candMax);

        if ($overlapEnd < $overlapStart) {
            return 0;
        }

        $candRange = max(1, $candMax - $candMin);
        $overlap = $overlapEnd - $overlapStart;

        return (int) round(min(1, $overlap / $candRange) * 15);
    }
}
