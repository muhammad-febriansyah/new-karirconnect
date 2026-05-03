<?php

namespace App\Services\JobAlerts;

use App\Enums\JobStatus;
use App\Models\Job;
use App\Models\JobAlert;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Matches a saved JobAlert against the published-job pool. Each alert criterion
 * narrows the query; criteria left empty are no-ops so an alert with only a
 * keyword still works. The since-cutoff defaults to the alert's last_sent_at
 * to make digests strictly incremental.
 */
class JobAlertMatcherService
{
    /**
     * @return Collection<int, Job>
     */
    public function match(JobAlert $alert, ?int $limit = 20): Collection
    {
        $query = Job::query()
            ->with(['company:id,name,slug,logo_path', 'category:id,name', 'city:id,name'])
            ->where('status', JobStatus::Published)
            ->whereNotNull('published_at');

        $cutoff = $alert->last_sent_at;
        if ($cutoff) {
            $query->where('published_at', '>=', $cutoff);
        }

        $this->applyKeyword($query, $alert->keyword);
        $this->applyScalar($query, 'job_category_id', $alert->job_category_id);
        $this->applyScalar($query, 'city_id', $alert->city_id);
        $this->applyScalar($query, 'province_id', $alert->province_id);
        $this->applyScalar($query, 'experience_level', $alert->experience_level?->value);
        $this->applyScalar($query, 'employment_type', $alert->employment_type);
        $this->applyScalar($query, 'work_arrangement', $alert->work_arrangement);
        $this->applySalary($query, $alert->salary_min);

        return $query->latest('published_at')
            ->when($limit, fn ($q) => $q->limit($limit))
            ->get();
    }

    private function applyKeyword(Builder $query, ?string $keyword): void
    {
        if ($keyword === null || trim($keyword) === '') {
            return;
        }

        $needle = '%'.trim($keyword).'%';
        $query->where(function (Builder $q) use ($needle): void {
            $q->where('title', 'like', $needle)
                ->orWhere('description', 'like', $needle)
                ->orWhere('responsibilities', 'like', $needle)
                ->orWhere('requirements', 'like', $needle);
        });
    }

    private function applyScalar(Builder $query, string $column, mixed $value): void
    {
        if ($value === null || $value === '' || $value === 0) {
            return;
        }

        $query->where($column, $value);
    }

    private function applySalary(Builder $query, ?int $salaryMin): void
    {
        if (! $salaryMin || $salaryMin <= 0) {
            return;
        }

        $query->where(function (Builder $q) use ($salaryMin): void {
            $q->whereNull('salary_min')
                ->orWhere('salary_max', '>=', $salaryMin)
                ->orWhere('salary_min', '>=', $salaryMin);
        });
    }
}
