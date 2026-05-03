<?php

namespace App\Policies;

use App\Enums\AiInterviewStatus;
use App\Models\AiInterviewSession;
use App\Models\User;

class AiInterviewSessionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isEmployer() || $user->isEmployee();
    }

    public function view(User $user, AiInterviewSession $session): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isEmployee()) {
            return $session->candidateProfile?->user_id === $user->id;
        }

        if ($user->isEmployer()) {
            return $this->userManagesCompany($user, $session->job?->company_id);
        }

        return false;
    }

    public function start(User $user, AiInterviewSession $session): bool
    {
        if (! $user->isEmployee()) {
            return false;
        }

        if ($session->candidateProfile?->user_id !== $user->id) {
            return false;
        }

        return in_array(
            $session->status,
            [AiInterviewStatus::Pending, AiInterviewStatus::Invited],
            true,
        );
    }

    public function submit(User $user, AiInterviewSession $session): bool
    {
        return $user->isEmployee()
            && $session->candidateProfile?->user_id === $user->id
            && $session->status === AiInterviewStatus::InProgress;
    }

    public function viewResult(User $user, AiInterviewSession $session): bool
    {
        if ($session->status !== AiInterviewStatus::Completed) {
            return $user->isAdmin();
        }

        return $this->view($user, $session);
    }

    public function cancel(User $user, AiInterviewSession $session): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isEmployer() && $this->userManagesCompany($user, $session->job?->company_id);
    }

    public function delete(User $user, AiInterviewSession $session): bool
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
