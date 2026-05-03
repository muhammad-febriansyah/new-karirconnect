<?php

namespace App\Filters\Talent;

use App\Models\EmployeeProfile;
use Illuminate\Contracts\Database\Eloquent\Builder;

/**
 * Composable filter for the employer-side talent search. Mirrors the structure
 * of JobBrowseFilter so query state is built one predicate at a time and each
 * step is a no-op when its input is empty. Visibility is enforced unconditionally
 * — candidates with `private` profiles never surface, even if other filters match.
 *
 * @phpstan-type TalentFilters array{
 *     keyword?: string|null,
 *     province_id?: int|null,
 *     city_id?: int|null,
 *     experience_level?: string|array<int, string>|null,
 *     skill_ids?: array<int, int>|null,
 *     salary_max?: int|null,
 *     open_to_work?: bool|null,
 *     sort?: string|null,
 * }
 */
class TalentSearchFilter
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function apply(array $filters = []): Builder
    {
        $query = EmployeeProfile::query()
            ->with([
                'user:id,name,email,phone,avatar_path,is_active',
                'province:id,name',
                'city:id,name,province_id',
                'skills:id,name,slug',
            ])
            ->whereIn('visibility', ['public', 'employers'])
            ->whereHas('user', fn ($q) => $q->where('is_active', true));

        $this->applyKeyword($query, $filters['keyword'] ?? null);
        $this->applyLocation($query, $filters);
        $this->applyExperience($query, $filters['experience_level'] ?? null);
        $this->applySkills($query, $filters['skill_ids'] ?? null);
        $this->applySalary($query, $filters['salary_max'] ?? null);
        $this->applyOpenToWork($query, $filters['open_to_work'] ?? null);
        $this->applySort($query, $filters['sort'] ?? null);

        return $query;
    }

    private function applyKeyword(Builder $query, ?string $keyword): void
    {
        if ($keyword === null || trim($keyword) === '') {
            return;
        }

        $needle = '%'.trim($keyword).'%';
        $query->where(function (Builder $q) use ($needle): void {
            $q->where('headline', 'like', $needle)
                ->orWhere('current_position', 'like', $needle)
                ->orWhere('about', 'like', $needle)
                ->orWhereHas('user', fn (Builder $u) => $u->where('name', 'like', $needle));
        });
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyLocation(Builder $query, array $filters): void
    {
        if (! empty($filters['province_id'])) {
            $query->where('province_id', (int) $filters['province_id']);
        }
        if (! empty($filters['city_id'])) {
            $query->where('city_id', (int) $filters['city_id']);
        }
    }

    /**
     * @param  string|array<int, string>|null  $value
     */
    private function applyExperience(Builder $query, mixed $value): void
    {
        if (empty($value)) {
            return;
        }

        $values = is_array($value) ? $value : [$value];
        $query->whereIn('experience_level', $values);
    }

    /**
     * @param  array<int, int>|null  $skillIds
     */
    private function applySkills(Builder $query, ?array $skillIds): void
    {
        if (empty($skillIds)) {
            return;
        }

        $query->whereHas('skills', fn (Builder $s) => $s->whereIn('skills.id', $skillIds), '>=', count($skillIds));
    }

    private function applySalary(Builder $query, ?int $salaryMax): void
    {
        if (! $salaryMax || $salaryMax <= 0) {
            return;
        }

        $query->where(function (Builder $q) use ($salaryMax): void {
            $q->whereNull('expected_salary_min')
                ->orWhere('expected_salary_min', '<=', $salaryMax);
        });
    }

    private function applyOpenToWork(Builder $query, ?bool $openToWork): void
    {
        if ($openToWork === null) {
            return;
        }

        $query->where('is_open_to_work', $openToWork);
    }

    private function applySort(Builder $query, ?string $sort): void
    {
        match ($sort) {
            'recent' => $query->latest('updated_at'),
            'completion' => $query->orderByDesc('profile_completion'),
            default => $query->orderByDesc('is_open_to_work')->latest('updated_at'),
        };
    }
}
