<?php

namespace App\Services\Recommendations;

use App\Enums\JobStatus;
use App\Models\AiMatchScore;
use App\Models\DismissedJobRecommendation;
use App\Models\EmployeeProfile;
use App\Models\Job;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Scores published jobs against an employee profile to surface personalised
 * recommendations. Scoring is intentionally explainable (PHP-side breakdown
 * stored on AiMatchScore) so the UI can show "why this match" — that's the
 * point of recommendations vs. a black-box ranker.
 *
 * Cached scores are reused when fresh; otherwise we recompute. Cache lifetime
 * is the trade-off between staleness (profile changed → score stale) and cost
 * (recomputing every page load is wasteful for large pools).
 */
class JobRecommendationService
{
    private const CACHE_TTL_DAYS = 7;

    private const SKILL_WEIGHT = 50;

    private const CATEGORY_WEIGHT = 15;

    private const CITY_WEIGHT = 15;

    private const SALARY_WEIGHT = 10;

    private const RECENCY_WEIGHT = 10;

    /**
     * @return Collection<int, array{job: Job, score: int, breakdown: array<string, int>, explanation: string, computed_at: Carbon}>
     */
    public function recommend(EmployeeProfile $profile, int $limit = 12): Collection
    {
        $profile->loadMissing(['skills:id', 'applications:id,job_id,employee_profile_id']);

        $appliedJobIds = $profile->applications->pluck('job_id')->all();
        $dismissedJobIds = DismissedJobRecommendation::query()
            ->where('employee_profile_id', $profile->id)
            ->pluck('job_id')
            ->all();
        $excludedIds = array_unique(array_merge($appliedJobIds, $dismissedJobIds));

        $candidates = Job::query()
            ->with(['company:id,name,slug,logo_path', 'category:id,name', 'city:id,name', 'skills:id'])
            ->where('status', JobStatus::Published)
            ->whereNotNull('published_at')
            ->when($excludedIds, fn ($q) => $q->whereNotIn('id', $excludedIds))
            ->latest('published_at')
            ->limit(max($limit * 4, 40))
            ->get();

        if ($candidates->isEmpty()) {
            return collect();
        }

        $cachedScores = AiMatchScore::query()
            ->where('candidate_profile_id', $profile->id)
            ->whereIn('job_id', $candidates->pluck('id'))
            ->get()
            ->keyBy('job_id');

        $preferredCategoryIds = $this->preferredCategoryIds($profile);
        $profileSkillIds = $profile->skills->pluck('id')->all();

        $scored = $candidates
            ->map(function (Job $job) use ($profile, $cachedScores, $preferredCategoryIds, $profileSkillIds): array {
                /** @var AiMatchScore|null $cached */
                $cached = $cachedScores->get($job->id);

                if ($cached && $cached->computed_at && $cached->computed_at->gt(now()->subDays(self::CACHE_TTL_DAYS))) {
                    return [
                        'job' => $job,
                        'score' => $cached->score,
                        'breakdown' => $cached->breakdown ?? [],
                        'explanation' => $cached->explanation ?? '',
                        'computed_at' => $cached->computed_at,
                    ];
                }

                $breakdown = $this->computeBreakdown($profile, $job, $preferredCategoryIds, $profileSkillIds);
                $score = (int) array_sum($breakdown);
                $explanation = $this->buildExplanation($breakdown, $job, $profileSkillIds);

                AiMatchScore::query()->updateOrCreate(
                    ['job_id' => $job->id, 'candidate_profile_id' => $profile->id],
                    [
                        'score' => $score,
                        'breakdown' => $breakdown,
                        'explanation' => $explanation,
                        'computed_at' => now(),
                    ],
                );

                return [
                    'job' => $job,
                    'score' => $score,
                    'breakdown' => $breakdown,
                    'explanation' => $explanation,
                    'computed_at' => now(),
                ];
            })
            ->sortByDesc('score')
            ->values()
            ->take($limit);

        return $scored;
    }

    public function dismiss(EmployeeProfile $profile, Job $job): void
    {
        DismissedJobRecommendation::query()->updateOrCreate(
            ['employee_profile_id' => $profile->id, 'job_id' => $job->id],
            ['dismissed_at' => now()],
        );
    }

    /**
     * @param  array<int, int>  $preferredCategoryIds
     * @param  array<int, int>  $profileSkillIds
     * @return array<string, int>
     */
    private function computeBreakdown(EmployeeProfile $profile, Job $job, array $preferredCategoryIds, array $profileSkillIds): array
    {
        return [
            'skills' => $this->skillsScore($profileSkillIds, $job),
            'category' => $this->categoryScore($preferredCategoryIds, $job),
            'city' => $this->cityScore($profile, $job),
            'salary' => $this->salaryScore($profile, $job),
            'recency' => $this->recencyScore($job),
        ];
    }

    /**
     * @param  array<int, int>  $profileSkillIds
     */
    private function skillsScore(array $profileSkillIds, Job $job): int
    {
        $jobSkillIds = $job->skills->pluck('id')->all();
        if ($jobSkillIds === [] || $profileSkillIds === []) {
            return 0;
        }

        $overlap = count(array_intersect($profileSkillIds, $jobSkillIds));

        return (int) round(($overlap / count($jobSkillIds)) * self::SKILL_WEIGHT);
    }

    /**
     * @param  array<int, int>  $preferredCategoryIds
     */
    private function categoryScore(array $preferredCategoryIds, Job $job): int
    {
        if ($job->job_category_id === null || $preferredCategoryIds === []) {
            return 0;
        }

        return in_array($job->job_category_id, $preferredCategoryIds, true) ? self::CATEGORY_WEIGHT : 0;
    }

    private function cityScore(EmployeeProfile $profile, Job $job): int
    {
        if ($profile->city_id === null || $job->city_id === null) {
            return 0;
        }

        if ($profile->city_id === $job->city_id) {
            return self::CITY_WEIGHT;
        }

        if ($profile->province_id !== null && $job->province_id !== null && $profile->province_id === $job->province_id) {
            return (int) round(self::CITY_WEIGHT / 2);
        }

        return 0;
    }

    private function salaryScore(EmployeeProfile $profile, Job $job): int
    {
        $expected = $profile->expected_salary_min;
        if ($expected === null || $expected <= 0) {
            return 0;
        }

        $jobMax = $job->salary_max ?? $job->salary_min;
        if ($jobMax === null) {
            return 0;
        }

        return $jobMax >= $expected ? self::SALARY_WEIGHT : 0;
    }

    private function recencyScore(Job $job): int
    {
        if (! $job->published_at) {
            return 0;
        }

        $daysOld = $job->published_at->diffInDays(now());
        if ($daysOld <= 3) {
            return self::RECENCY_WEIGHT;
        }
        if ($daysOld <= 14) {
            return (int) round(self::RECENCY_WEIGHT / 2);
        }

        return 0;
    }

    /**
     * @return array<int, int>
     */
    private function preferredCategoryIds(EmployeeProfile $profile): array
    {
        return $profile->applications
            ->loadMissing('job:id,job_category_id')
            ->pluck('job.job_category_id')
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  array<string, int>  $breakdown
     * @param  array<int, int>  $profileSkillIds
     */
    private function buildExplanation(array $breakdown, Job $job, array $profileSkillIds): string
    {
        $parts = [];

        $jobSkillIds = $job->skills->pluck('id')->all();
        if ($jobSkillIds !== []) {
            $overlap = count(array_intersect($profileSkillIds, $jobSkillIds));
            if ($overlap > 0) {
                $parts[] = sprintf('%d dari %d skill cocok', $overlap, count($jobSkillIds));
            }
        }

        if (($breakdown['city'] ?? 0) >= self::CITY_WEIGHT) {
            $parts[] = 'lokasi sesuai';
        } elseif (($breakdown['city'] ?? 0) > 0) {
            $parts[] = 'provinsi sama';
        }

        if (($breakdown['salary'] ?? 0) > 0) {
            $parts[] = 'gaji memenuhi ekspektasi';
        }

        if (($breakdown['category'] ?? 0) > 0) {
            $parts[] = 'kategori sejalan dengan riwayat lamaran';
        }

        if (($breakdown['recency'] ?? 0) === self::RECENCY_WEIGHT) {
            $parts[] = 'baru diposting';
        }

        return $parts === [] ? 'Lowongan baru yang mungkin cocok' : implode(' · ', $parts);
    }
}
