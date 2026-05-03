<?php

namespace App\Services\SalaryInsight;

use App\Enums\JobStatus;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\SalaryInsight;
use App\Models\SalarySubmission;
use Illuminate\Database\Eloquent\Builder;

/**
 * Computes salary percentiles by combining two signals:
 *   1. Published job posts (range midpoint) — current market demand.
 *   2. Approved salary submissions from candidates — what people actually earn.
 *
 * Both feed the same in-memory bucket, then percentile/median is computed in
 * PHP so we stay portable across SQLite (tests) and MySQL (production). The
 * sample size is part of the response so consumers can hide insights when the
 * data is too thin to be meaningful.
 */
class SalaryInsightService
{
    /**
     * @param  array<string, mixed>  $filters
     * @return array{
     *     sample_size: int,
     *     posting_count: int,
     *     submission_count: int,
     *     p25: int|null,
     *     p50: int|null,
     *     p75: int|null,
     *     min: int|null,
     *     max: int|null,
     *     average: int|null,
     *     by_experience: array<string, array{count:int, p50:int|null}>,
     * }
     */
    public function aggregate(array $filters): array
    {
        $postingPoints = $this->postingPoints($filters);
        $submissionPoints = $this->submissionPoints($filters);

        $points = array_merge($postingPoints, $submissionPoints);
        sort($points);

        $byLevel = $this->groupByExperience($filters);

        return [
            'sample_size' => count($points),
            'posting_count' => count($postingPoints),
            'submission_count' => count($submissionPoints),
            'p25' => $this->percentile($points, 25),
            'p50' => $this->percentile($points, 50),
            'p75' => $this->percentile($points, 75),
            'min' => $points === [] ? null : (int) $points[0],
            'max' => $points === [] ? null : (int) end($points),
            'average' => $points === [] ? null : (int) round(array_sum($points) / count($points)),
            'by_experience' => $byLevel,
        ];
    }

    /**
     * Top employers by sample density for a given filter slice. Useful for the
     * "Companies hiring this role" section on the public page.
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array{company_name:string, slug:string, count:int, p50:int|null}>
     */
    public function topCompanies(array $filters, int $limit = 10): array
    {
        $query = Job::query()
            ->where('status', JobStatus::Published)
            ->whereNotNull('salary_min');

        $this->applyFilters($query, $filters);

        return $query->with('company:id,name,slug')
            ->get()
            ->groupBy('company_id')
            ->map(function ($jobs) {
                $points = $jobs->map(fn (Job $j) => $this->midpoint($j->salary_min, $j->salary_max))->all();
                sort($points);

                return [
                    'company_name' => $jobs->first()->company?->name ?? 'Unknown',
                    'slug' => $jobs->first()->company?->slug ?? '',
                    'count' => $jobs->count(),
                    'p50' => $this->percentile($points, 50),
                ];
            })
            ->sortByDesc('count')
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * Recent approved submissions for transparency — drives the "What people
     * told us" feed on the insight page.
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function recentSubmissions(array $filters, int $limit = 8): array
    {
        $query = SalarySubmission::query()
            ->with('city:id,name', 'category:id,name')
            ->where('status', 'approved');

        if (! empty($filters['job_category_id'])) {
            $query->where('job_category_id', (int) $filters['job_category_id']);
        }
        if (! empty($filters['city_id'])) {
            $query->where('city_id', (int) $filters['city_id']);
        }
        if (! empty($filters['experience_level'])) {
            $query->where('experience_level', $filters['experience_level']);
        }

        return $query->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (SalarySubmission $s) => [
                'job_title' => $s->job_title,
                'salary_idr' => $s->salary_idr,
                'bonus_idr' => $s->bonus_idr,
                'experience_level' => $s->experience_level?->value,
                'experience_years' => $s->experience_years,
                'employment_type' => $s->employment_type,
                'city' => $s->city?->name,
                'category' => $s->category?->name,
                'is_anonymous' => $s->is_anonymous,
                'created_at' => optional($s->created_at)->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return array<int, array{id:int, name:string, slug:string, count:int}>
     */
    public function categoriesWithSamples(int $limit = 12): array
    {
        $counts = Job::query()
            ->where('status', JobStatus::Published)
            ->whereNotNull('salary_min')
            ->selectRaw('job_category_id, count(*) as c')
            ->groupBy('job_category_id')
            ->pluck('c', 'job_category_id')
            ->all();

        if ($counts === []) {
            return [];
        }

        return JobCategory::query()
            ->whereIn('id', array_keys($counts))
            ->get(['id', 'name', 'slug'])
            ->map(fn (JobCategory $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'count' => (int) ($counts[$c->id] ?? 0),
            ])
            ->sortByDesc('count')
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function curatedInsights(array $filters, int $limit = 8): array
    {
        $query = SalaryInsight::query()->with('city:id,name')->latest('last_updated_at')->latest('id');

        if (! empty($filters['job_category_id'])) {
            $categoryName = JobCategory::query()->whereKey((int) $filters['job_category_id'])->value('name');

            if ($categoryName !== null) {
                $query->where('role_category', $categoryName);
            }
        }

        if (! empty($filters['city_id'])) {
            $query->where('city_id', (int) $filters['city_id']);
        }

        if (! empty($filters['experience_level'])) {
            $query->where('experience_level', $filters['experience_level']);
        }

        return $query->limit($limit)
            ->get()
            ->map(fn (SalaryInsight $insight): array => [
                'id' => $insight->id,
                'job_title' => $insight->job_title,
                'role_category' => $insight->role_category,
                'city' => $insight->city?->name,
                'experience_level' => $insight->experience_level?->value,
                'min_salary' => $insight->min_salary,
                'median_salary' => $insight->median_salary,
                'max_salary' => $insight->max_salary,
                'sample_size' => $insight->sample_size,
                'source' => $insight->source,
                'last_updated_at' => optional($insight->last_updated_at)->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<int, int>
     */
    private function postingPoints(array $filters): array
    {
        $query = Job::query()
            ->where('status', JobStatus::Published)
            ->whereNotNull('salary_min');

        $this->applyFilters($query, $filters);

        return $query->get(['salary_min', 'salary_max'])
            ->map(fn (Job $j) => $this->midpoint($j->salary_min, $j->salary_max))
            ->filter(fn ($v) => $v > 0)
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<int, int>
     */
    private function submissionPoints(array $filters): array
    {
        $query = SalarySubmission::query()->where('status', 'approved');

        if (! empty($filters['job_category_id'])) {
            $query->where('job_category_id', (int) $filters['job_category_id']);
        }
        if (! empty($filters['city_id'])) {
            $query->where('city_id', (int) $filters['city_id']);
        }
        if (! empty($filters['experience_level'])) {
            $query->where('experience_level', $filters['experience_level']);
        }
        if (! empty($filters['employment_type'])) {
            $query->where('employment_type', $filters['employment_type']);
        }

        return $query->pluck('salary_idr')->map(fn ($v) => (int) $v)->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, array{count:int, p50:int|null}>
     */
    private function groupByExperience(array $filters): array
    {
        $levels = ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'];
        $out = [];

        foreach ($levels as $level) {
            $merged = array_merge(
                $this->postingPoints(array_merge($filters, ['experience_level' => $level])),
                $this->submissionPoints(array_merge($filters, ['experience_level' => $level])),
            );
            sort($merged);

            $out[$level] = [
                'count' => count($merged),
                'p50' => $this->percentile($merged, 50),
            ];
        }

        return $out;
    }

    /**
     * @param  Builder<Job>  $query
     * @param  array<string, mixed>  $filters
     */
    private function applyFilters($query, array $filters): void
    {
        if (! empty($filters['job_category_id'])) {
            $query->where('job_category_id', (int) $filters['job_category_id']);
        }
        if (! empty($filters['city_id'])) {
            $query->where('city_id', (int) $filters['city_id']);
        }
        if (! empty($filters['province_id'])) {
            $query->where('province_id', (int) $filters['province_id']);
        }
        if (! empty($filters['experience_level'])) {
            $query->where('experience_level', $filters['experience_level']);
        }
        if (! empty($filters['employment_type'])) {
            $query->where('employment_type', $filters['employment_type']);
        }
    }

    private function midpoint(?int $min, ?int $max): int
    {
        if ($min === null) {
            return 0;
        }
        if ($max === null || $max < $min) {
            return $min;
        }

        return (int) (($min + $max) / 2);
    }

    /**
     * @param  array<int, int>  $sortedPoints
     */
    private function percentile(array $sortedPoints, int $percentile): ?int
    {
        if ($sortedPoints === []) {
            return null;
        }

        $count = count($sortedPoints);
        if ($count === 1) {
            return (int) $sortedPoints[0];
        }

        $rank = ($percentile / 100) * ($count - 1);
        $lower = (int) floor($rank);
        $upper = (int) ceil($rank);
        $weight = $rank - $lower;

        return (int) round(
            $sortedPoints[$lower] * (1 - $weight) + $sortedPoints[$upper] * $weight,
        );
    }
}
