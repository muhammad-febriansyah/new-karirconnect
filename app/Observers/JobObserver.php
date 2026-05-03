<?php

namespace App\Observers;

use App\Enums\JobStatus;
use App\Jobs\RecomputeMatchScoresForJobJob;
use App\Models\Job;
use Illuminate\Support\Str;

class JobObserver
{
    /**
     * Match-score inputs we watch. When any of these change after publish,
     * we re-run the matcher across every existing applicant in the background.
     */
    private const MATCH_RELEVANT_FIELDS = [
        'salary_min',
        'salary_max',
        'experience_level',
        'work_arrangement',
        'min_education',
        'city_id',
        'province_id',
    ];

    public function saving(Job $job): void
    {
        if ($job->title && (! $job->slug || $job->isDirty('title'))) {
            $job->slug = $this->uniqueSlug($job);
        }

        if ($job->status === JobStatus::Published && ! $job->published_at) {
            $job->published_at = now();
        }

        if ($job->status === JobStatus::Closed && ! $job->closed_at) {
            $job->closed_at = now();
        }

        if ($job->status !== JobStatus::Closed) {
            $job->closed_at = null;
        }
    }

    public function updated(Job $job): void
    {
        if (! $job->wasChanged(self::MATCH_RELEVANT_FIELDS)) {
            return;
        }

        if ($job->applications_count === 0) {
            return;
        }

        RecomputeMatchScoresForJobJob::dispatch($job->id);
    }

    private function uniqueSlug(Job $job): string
    {
        $base = Str::slug($job->title);
        $slug = $base;
        $suffix = 1;

        while (Job::query()
            ->where('slug', $slug)
            ->when($job->exists, fn ($query) => $query->whereKeyNot($job->getKey()))
            ->exists()) {
            $slug = $base.'-'.++$suffix;
        }

        return $slug;
    }
}
