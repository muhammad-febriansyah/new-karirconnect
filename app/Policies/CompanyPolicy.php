<?php

namespace App\Policies;

use App\Enums\CompanyStatus;
use App\Models\Company;
use App\Models\User;

class CompanyPolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, Company $company): bool
    {
        if ($company->status === CompanyStatus::Approved) {
            return true;
        }

        if ($user === null) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $this->userManagesCompany($user, $company);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isEmployer();
    }

    public function update(User $user, Company $company): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isEmployer() && $this->userManagesCompany($user, $company);
    }

    public function manageTeam(User $user, Company $company): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if (! $user->isEmployer()) {
            return false;
        }

        if ($company->owner_id === $user->id) {
            return true;
        }

        return $user->companyMemberships()
            ->where('company_id', $company->id)
            ->whereIn('role', ['owner', 'admin'])
            ->whereNotNull('joined_at')
            ->exists();
    }

    public function requestVerification(User $user, Company $company): bool
    {
        return $this->manageTeam($user, $company);
    }

    public function delete(User $user, Company $company): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $company->owner_id === $user->id;
    }

    public function approve(User $user, Company $company): bool
    {
        return $user->isAdmin();
    }

    public function verify(User $user, Company $company): bool
    {
        return $user->isAdmin();
    }

    protected function userManagesCompany(User $user, Company $company): bool
    {
        if ($company->owner_id === $user->id) {
            return true;
        }

        return $user->companyMemberships()
            ->where('company_id', $company->id)
            ->whereNotNull('joined_at')
            ->exists();
    }
}
