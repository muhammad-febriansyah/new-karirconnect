<?php

namespace App\Policies;

use App\Models\MessageTemplate;
use App\Models\User;

class MessageTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isEmployer();
    }

    public function view(User $user, MessageTemplate $template): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isEmployer() && $this->userManagesCompany($user, $template->company_id);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isEmployer();
    }

    public function update(User $user, MessageTemplate $template): bool
    {
        return $this->view($user, $template);
    }

    public function delete(User $user, MessageTemplate $template): bool
    {
        return $this->view($user, $template);
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
