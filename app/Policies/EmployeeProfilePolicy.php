<?php

namespace App\Policies;

use App\Models\EmployeeProfile;
use App\Models\User;

class EmployeeProfilePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isEmployer();
    }

    public function view(User $user, EmployeeProfile $profile): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($profile->user_id === $user->id) {
            return true;
        }

        if ($user->isEmployer()) {
            $visibility = (string) ($profile->visibility ?? 'public');

            return in_array($visibility, ['public', 'recruiter_only'], true);
        }

        return false;
    }

    public function update(User $user, EmployeeProfile $profile): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $profile->user_id === $user->id;
    }

    public function delete(User $user, EmployeeProfile $profile): bool
    {
        return $user->isAdmin() || $profile->user_id === $user->id;
    }

    public function contact(User $user, EmployeeProfile $profile): bool
    {
        return $user->isEmployer() && $this->view($user, $profile);
    }
}
