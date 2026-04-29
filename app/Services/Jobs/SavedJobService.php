<?php

namespace App\Services\Jobs;

use App\Models\Job;
use App\Models\SavedJob;
use App\Models\User;

class SavedJobService
{
    public function toggle(User $user, Job $job, ?string $note = null): bool
    {
        $existing = SavedJob::query()
            ->where('user_id', $user->id)
            ->where('job_id', $job->id)
            ->first();

        if ($existing) {
            $existing->delete();

            return false;
        }

        SavedJob::query()->create([
            'user_id' => $user->id,
            'job_id' => $job->id,
            'note' => $note,
        ]);

        return true;
    }

    public function isSaved(User $user, Job $job): bool
    {
        return SavedJob::query()
            ->where('user_id', $user->id)
            ->where('job_id', $job->id)
            ->exists();
    }
}
