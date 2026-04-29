<?php

namespace App\Observers;

use App\Enums\JobStatus;
use App\Models\Job;
use Illuminate\Support\Str;

class JobObserver
{
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
