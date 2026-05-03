<?php

namespace App\Policies;

use App\Models\SubscriptionPlan;
use App\Models\User;

class SubscriptionPlanPolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, SubscriptionPlan $plan): bool
    {
        if ($plan->is_active) {
            return true;
        }

        return $user !== null && $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, SubscriptionPlan $plan): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, SubscriptionPlan $plan): bool
    {
        return $user->isAdmin();
    }
}
