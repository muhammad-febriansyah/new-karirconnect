<?php

namespace App\Filters\Jobs;

use App\Enums\JobStatus;
use App\Models\Job;
use Illuminate\Contracts\Database\Eloquent\Builder;

/**
 * Composable browse filter for the public /jobs index. Each filter is a no-op
 * when its input is empty so the same query builder works for SSR + JSON.
 *
 * Inputs come from the request and are kept loosely-typed; FormRequest handles
 * sanitization at the boundary.
 *
 * @phpstan-type JobBrowseFilters array{
 *     search?: string|null,
 *     location?: string|null,
 *     city_id?: int|null,
 *     province_id?: int|null,
 *     category_id?: int|null,
 *     employment_type?: string|array<int, string>|null,
 *     work_arrangement?: string|array<int, string>|null,
 *     experience_level?: string|array<int, string>|null,
 *     salary_min?: int|null,
 *     skill_ids?: array<int, int>|null,
 *     featured_only?: bool|null,
 *     sort?: string|null,
 * }
 */
class JobBrowseFilter
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function apply(array $filters = []): Builder
    {
        $query = Job::query()
            ->with([
                'company:id,name,slug,logo_path,verification_status',
                'category:id,name,slug',
                'city:id,name,province_id',
                'city.province:id,name',
                'skills:id,name',
            ])
            ->where('status', JobStatus::Published)
            ->whereNotNull('published_at');

        $this->applyDeadline($query);
        $this->applySearch($query, $filters['search'] ?? null);
        $this->applyLocation($query, $filters);
        $this->applyCategory($query, $filters['category_id'] ?? null);
        $this->applyEnumFilter($query, 'employment_type', $filters['employment_type'] ?? null);
        $this->applyEnumFilter($query, 'work_arrangement', $filters['work_arrangement'] ?? null);
        $this->applyEnumFilter($query, 'experience_level', $filters['experience_level'] ?? null);
        $this->applySalary($query, $filters['salary_min'] ?? null);
        $this->applySkills($query, $filters['skill_ids'] ?? null);
        $this->applyFeatured($query, $filters['featured_only'] ?? null);
        $this->applySort($query, $filters['sort'] ?? null);

        return $query;
    }

    private function applyDeadline(Builder $query): void
    {
        $query->where(function (Builder $q): void {
            $q->whereNull('application_deadline')
                ->orWhere('application_deadline', '>=', now()->toDateString());
        });
    }

    private function applySearch(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);
        if ($term === '') {
            return;
        }

        $like = "%{$term}%";
        $query->where(function (Builder $q) use ($like): void {
            $q->where('title', 'like', $like)
                ->orWhereHas('company', fn (Builder $sub) => $sub->where('name', 'like', $like));
        });
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyLocation(Builder $query, array $filters): void
    {
        if (! empty($filters['city_id'])) {
            $query->where('city_id', (int) $filters['city_id']);
        }
        if (! empty($filters['province_id'])) {
            $query->where('province_id', (int) $filters['province_id']);
        }
    }

    private function applyCategory(Builder $query, mixed $categoryId): void
    {
        if (! empty($categoryId)) {
            $query->where('job_category_id', (int) $categoryId);
        }
    }

    private function applyEnumFilter(Builder $query, string $column, mixed $value): void
    {
        if (empty($value)) {
            return;
        }

        $values = is_array($value) ? array_filter($value) : [$value];
        if (count($values) === 0) {
            return;
        }

        $query->whereIn($column, $values);
    }

    private function applySalary(Builder $query, mixed $salaryMin): void
    {
        if (! is_numeric($salaryMin) || (int) $salaryMin <= 0) {
            return;
        }

        $query->where(function (Builder $q) use ($salaryMin): void {
            $q->where('salary_max', '>=', (int) $salaryMin)
                ->orWhere('salary_min', '>=', (int) $salaryMin);
        });
    }

    /**
     * @param  array<int, int>|null  $skillIds
     */
    private function applySkills(Builder $query, ?array $skillIds): void
    {
        $skillIds = array_filter((array) ($skillIds ?? []));
        if (count($skillIds) === 0) {
            return;
        }

        $query->whereHas('skills', fn (Builder $q) => $q->whereIn('skills.id', $skillIds));
    }

    private function applyFeatured(Builder $query, mixed $featuredOnly): void
    {
        if (filter_var($featuredOnly, FILTER_VALIDATE_BOOLEAN)) {
            $query->where('is_featured', true)
                ->where(function (Builder $q): void {
                    $q->whereNull('featured_until')->orWhere('featured_until', '>=', now());
                });
        }
    }

    private function applySort(Builder $query, ?string $sort): void
    {
        match ($sort) {
            'salary_desc' => $query->orderByDesc('salary_max'),
            'salary_asc' => $query->orderBy('salary_min'),
            'oldest' => $query->orderBy('published_at'),
            default => $query->orderByDesc('is_featured')->orderByDesc('published_at'),
        };
    }
}
