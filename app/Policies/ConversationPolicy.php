<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

class ConversationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isEmployer() || $user->isEmployee();
    }

    public function view(User $user, Conversation $conversation): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $conversation->hasParticipant($user->id);
    }

    public function send(User $user, Conversation $conversation): bool
    {
        return $conversation->hasParticipant($user->id);
    }

    public function create(User $user): bool
    {
        return $user->isEmployer() || $user->isEmployee() || $user->isAdmin();
    }

    public function delete(User $user, Conversation $conversation): bool
    {
        return $user->isAdmin();
    }
}
