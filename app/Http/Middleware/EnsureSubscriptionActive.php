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
            return $this->deny(
                $request,
                'Lengkapi profil perusahaan terlebih dahulu.',
                'company_missing',
                fn () => redirect()->route('employer.company.edit')
                    ->with('error', 'Lengkapi profil perusahaan terlebih dahulu.'),
            );
        }

        $subscription = CompanySubscription::query()
            ->with('plan:id,tier')
            ->where('company_id', $company->id)
            ->where('status', SubscriptionStatus::Active)
            ->latest('id')
            ->first();

        if (! $subscription || ! $subscription->isActive()) {
            return $this->deny(
                $request,
                'Fitur ini membutuhkan langganan aktif.',
                'subscription_required',
                fn () => redirect()->route('employer.billing.index')
                    ->with('warning', 'Fitur ini membutuhkan langganan aktif.'),
            );
        }

        if ($minTier !== null && ! $this->meetsTier($subscription->plan?->tier, $minTier)) {
            return $this->deny(
                $request,
                "Fitur ini membutuhkan paket {$minTier} atau lebih tinggi.",
                'subscription_tier_too_low',
                fn () => redirect()->route('employer.billing.index')
                    ->with('warning', "Fitur ini membutuhkan paket {$minTier} atau lebih tinggi."),
            );
        }

        return $next($request);
    }

    /**
     * Web callers get the redirect they already expect; API callers get a
     * status plus a machine-readable code, because a mobile client cannot do
     * anything useful with a 302 to an HTML billing page.
     *
     * @param  Closure(): Response  $webResponse
     */
    private function deny(Request $request, string $message, string $code, Closure $webResponse): Response
    {
        if ($request->is('api/*')) {
            return response()->json(['message' => $message, 'code' => $code], 403);
        }

        return $webResponse();
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
