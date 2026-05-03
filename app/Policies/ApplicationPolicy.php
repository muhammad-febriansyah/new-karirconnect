<?php

namespace App\Policies;

use App\Models\Application;
use App\Models\User;

class ApplicationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isEmployer() || $user->isEmployee();
    }

    public function view(User $user, Application $application): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isEmployee()) {
            return $application->employeeProfile?->user_id === $user->id;
        }

        if ($user->isEmployer()) {
            return $this->userManagesCompany($user, $application->job?->company_id);
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->isEmployee() && $user->employeeProfile !== null;
    }

    public function update(User $user, Application $application): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isEmployer() && $this->userManagesCompany($user, $application->job?->company_id);
    }

    public function changeStatus(User $user, Application $application): bool
    {
        return $this->update($user, $application);
    }

    public function withdraw(User $user, Application $application): bool
    {
        return $user->isEmployee()
            && $application->employeeProfile?->user_id === $user->id;
    }

    public function delete(User $user, Application $application): bool
    {
        return $user->isAdmin();
    }

    protected function userManagesCompany(User $user, ?int $companyId): bool
    {
        if ($companyId === null) {
            return false;
        }

        return $user->companyMemberships()
            ->where('company_id', $companyId)
            ->whereNotNull('joined_at')
            ->exists();
    }
}
