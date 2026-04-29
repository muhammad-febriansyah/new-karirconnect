<?php

namespace App\Http\Middleware;

use App\Enums\SubscriptionStatus;
use App\Enums\SubscriptionTier;
use App\Models\Company;
use App\Models\CompanySubscription;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates premium employer features behind an active paid subscription. Pass
 * the minimum tier as the route param, e.g. `subscription.active:pro`. Free
 * is always considered active for the user-facing dashboard, but for premium
 * features we require Starter or higher (configurable per route).
 */
class EnsureSubscriptionActive
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ?string $minTier = null): Response
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $company = Company::query()->where('owner_id', $user->id)->first();
        if (! $company) {
            return redirect()->route('employer.company.edit')
                ->with('error', 'Lengkapi profil perusahaan terlebih dahulu.');
        }

        $subscription = CompanySubscription::query()
            ->with('plan:id,tier')
            ->where('company_id', $company->id)
            ->where('status', SubscriptionStatus::Active)
            ->latest('id')
            ->first();

        if (! $subscription || ! $subscription->isActive()) {
            return redirect()->route('employer.billing.index')
                ->with('warning', 'Fitur ini membutuhkan langganan aktif.');
        }

        if ($minTier !== null && ! $this->meetsTier($subscription->plan?->tier, $minTier)) {
            return redirect()->route('employer.billing.index')
                ->with('warning', "Fitur ini membutuhkan paket {$minTier} atau lebih tinggi.");
        }

        return $next($request);
    }

    private function meetsTier(?SubscriptionTier $current, string $required): bool
    {
        $rank = [
            SubscriptionTier::Free->value => 0,
            SubscriptionTier::Starter->value => 1,
            SubscriptionTier::Pro->value => 2,
            SubscriptionTier::Enterprise->value => 3,
        ];

        $currentRank = $rank[$current?->value] ?? -1;
        $requiredRank = $rank[$required] ?? PHP_INT_MAX;

        return $currentRank >= $requiredRank;
    }
}
