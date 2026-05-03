<?php

namespace App\Policies;

use App\Enums\JobStatus;
use App\Models\Job;
use App\Models\User;

class JobPolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, Job $job): bool
    {
        if ($job->status === JobStatus::Published) {
            return true;
        }

        if ($user === null) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $this->userManagesCompany($user, $job->company_id);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isEmployer();
    }

    public function update(User $user, Job $job): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isEmployer() && $this->userManagesCompany($user, $job->company_id);
    }

    public function delete(User $user, Job $job): bool
    {
        return $this->update($user, $job);
    }

    public function publish(User $user, Job $job): bool
    {
        return $this->update($user, $job);
    }

    public function close(User $user, Job $job): bool
    {
        return $this->update($user, $job);
    }

    public function restore(User $user, Job $job): bool
    {
        return $user->isAdmin();
    }

    public function forceDelete(User $user, Job $job): bool
    {
        return $user->isAdmin();
    }

    protected function userManagesCompany(User $user, int $companyId): bool
    {
        return $user->companyMemberships()
            ->where('company_id', $companyId)
            ->whereNotNull('joined_at')
            ->exists();
    }
}
