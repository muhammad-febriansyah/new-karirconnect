<?php

namespace App\Policies;

use App\Models\JobSource;
use App\Models\User;

/**
 * Job scraper is admin-only end to end: sources, runs, listings and logs.
 */
class JobSourcePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, JobSource $jobSource): bool
    {
        return $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, JobSource $jobSource): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, JobSource $jobSource): bool
    {
        return $user->isAdmin();
    }

    public function run(User $user, JobSource $jobSource): bool
    {
        return $user->isAdmin() && $jobSource->isRunnable();
    }
}
