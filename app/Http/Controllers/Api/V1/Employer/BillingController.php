<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Enums\OrderStatus;
use App\Enums\SubscriptionTier;
use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\SubscriptionPlan;
use App\Services\Billing\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Subscription plans and checkout.
 *
 * Checkout returns the gateway's payment_url rather than redirecting to it, so
 * the app can open it in a browser/webview and then poll the order. Payment is
 * confirmed server-side by the Midtrans webhook, never by the client saying so.
 */
class BillingController extends Controller
{
    use ResolvesEmployerCompany;

    public function __construct(private readonly BillingService $billing) {}

    /**
     * Plans on offer, plus what this company currently has.
     */
    public function plans(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);
        $subscription = $company->activeSubscription();

        $plans = SubscriptionPlan::query()
            ->where('is_active', true)
            ->orderBy('price_idr')
            ->get()
            ->map(fn (SubscriptionPlan $plan) => [
                'id' => $plan->id,
                'slug' => $plan->slug,
                'name' => $plan->name,
                'tier' => $plan->tier?->value,
                'price_idr' => $plan->price_idr,
                'billing_period_days' => $plan->billing_period_days,
                'job_post_quota' => $plan->job_post_quota,
                'featured_credits' => $plan->featured_credits,
                'ai_interview_credits' => $plan->ai_interview_credits,
                'features' => $plan->features,
                'is_featured' => (bool) $plan->is_featured,

                // Trial is granted once at onboarding, never bought.
                'purchasable' => $plan->tier !== SubscriptionTier::Trial,
            ]);

        return response()->json([
            'data' => $plans,
            'meta' => [
                'current' => $subscription === null ? null : [
                    'plan' => $subscription->plan?->name,
                    'tier' => $subscription->plan?->tier?->value,
                    'status' => $subscription->status?->value,
                    'ends_at' => $subscription->ends_at?->toIso8601String(),
                    'jobs_posted_count' => $subscription->jobs_posted_count,
                    'job_post_quota' => $subscription->plan?->job_post_quota,
                ],
                'trial_used' => $company->hasUsedTrial(),
            ],
        ]);
    }

    public function checkout(Request $request, SubscriptionPlan $plan): JsonResponse
    {
        $company = $this->requireCompany($request);

        abort_unless($plan->is_active, 404);

        // Mirrors the web: Trial is granted once via onboarding. Allowing
        // checkout would route around the one-time guard.
        if ($plan->tier === SubscriptionTier::Trial) {
            return response()->json([
                'message' => 'Paket Trial aktif otomatis setelah onboarding dan tidak bisa dibeli.',
                'code' => 'trial_not_purchasable',
            ], 422);
        }

        try {
            $order = $this->billing->checkoutPlan($company, $request->user(), $plan);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'checkout_failed'], 422);
        }

        return response()->json([
            'data' => [
                'reference' => $order->reference,
                'status' => $order->status?->value,
                'amount_idr' => $order->amount_idr,

                // Null for a free plan, which BillingService activates outright.
                'payment_url' => $order->payment_url,
                'requires_payment' => $order->status !== OrderStatus::Paid,
            ],
        ], 201);
    }

    public function orders(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $orders = Order::query()
            ->where('company_id', $company->id)
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($orders->items())->map(fn (Order $order) => $this->present($order)),
            'meta' => ['total' => $orders->total()],
        ]);
    }

    /**
     * One order. The app polls this after sending the user to payment_url.
     */
    public function order(Request $request, string $reference): JsonResponse
    {
        $company = $this->requireCompany($request);

        $order = Order::query()
            ->with('transactions')
            ->where('company_id', $company->id)
            ->where('reference', $reference)
            ->firstOrFail();

        return response()->json([
            'data' => [
                ...$this->present($order),
                'transactions' => $order->transactions->map(fn ($transaction) => [
                    'id' => $transaction->id,
                    'status' => $transaction->status?->value,
                    'paid_at' => $transaction->paid_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Order $order): array
    {
        return [
            'reference' => $order->reference,
            'item_type' => $order->item_type?->value,
            'amount_idr' => $order->amount_idr,
            'status' => $order->status?->value,
            'payment_url' => $order->payment_url,
            'created_at' => $order->created_at?->toIso8601String(),
        ];
    }
}
