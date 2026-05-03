<?php

namespace App\Policies;

use App\Enums\InterviewStatus;
use App\Models\Interview;
use App\Models\User;

class InterviewPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isEmployer() || $user->isEmployee();
    }

    public function view(User $user, Interview $interview): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        $companyId = $interview->application?->job?->company_id;

        if ($user->isEmployer() && $this->userManagesCompany($user, $companyId)) {
            return true;
        }

        if ($user->isEmployee()) {
            if ($interview->application?->employeeProfile?->user_id === $user->id) {
                return true;
            }

            return $interview->participants()
                ->where('user_id', $user->id)
                ->exists();
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isEmployer();
    }

    public function update(User $user, Interview $interview): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isEmployer()
            && $this->userManagesCompany($user, $interview->application?->job?->company_id);
    }

    public function reschedule(User $user, Interview $interview): bool
    {
        if ($this->update($user, $interview)) {
            return true;
        }

        return $user->isEmployee()
            && $interview->application?->employeeProfile?->user_id === $user->id
            && $interview->status === InterviewStatus::Scheduled;
    }

    public function cancel(User $user, Interview $interview): bool
    {
        return $this->update($user, $interview);
    }

    public function confirm(User $user, Interview $interview): bool
    {
        return $user->isEmployee()
            && $interview->application?->employeeProfile?->user_id === $user->id;
    }

    public function submitScorecard(User $user, Interview $interview): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if (! $user->isEmployer()) {
            return false;
        }

        return $interview->participants()
            ->where('user_id', $user->id)
            ->where('role', 'interviewer')
            ->exists()
            || $interview->scheduled_by_user_id === $user->id;
    }

    public function delete(User $user, Interview $interview): bool
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
