<?php

namespace App\Http\Controllers\Employer;

use App\Enums\OrderStatus;
use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Order;
use App\Models\SubscriptionPlan;
use App\Services\Billing\BillingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function __construct(private readonly BillingService $billing) {}

    public function index(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $plans = SubscriptionPlan::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $current = CompanySubscription::query()
            ->with('plan:id,name,slug,tier')
            ->where('company_id', $company->id)
            ->where('status', SubscriptionStatus::Active)
            ->latest('id')
            ->first();

        $orders = Order::query()
            ->where('company_id', $company->id)
            ->latest('id')
            ->limit(20)
            ->get(['id', 'reference', 'description', 'amount_idr', 'status', 'created_at', 'paid_at']);

        return Inertia::render('employer/billing/index', [
            'plans' => $plans->map(fn (SubscriptionPlan $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'tier' => $p->tier->value,
                'price_idr' => $p->price_idr,
                'billing_period_days' => $p->billing_period_days,
                'job_post_quota' => $p->job_post_quota,
                'featured_credits' => $p->featured_credits,
                'ai_interview_credits' => $p->ai_interview_credits,
                'features' => $p->features ?? [],
                'is_featured' => $p->is_featured,
            ])->values(),
            'currentSubscription' => $current ? [
                'plan_name' => $current->plan?->name,
                'plan_tier' => $current->plan?->tier?->value,
                'status' => $current->status?->value,
                'starts_at' => optional($current->starts_at)->toIso8601String(),
                'ends_at' => optional($current->ends_at)->toIso8601String(),
                'jobs_posted_count' => $current->jobs_posted_count,
                'featured_credits_remaining' => $current->featured_credits_remaining,
                'ai_credits_remaining' => $current->ai_credits_remaining,
            ] : null,
            'orders' => $orders->map(fn (Order $o) => [
                'reference' => $o->reference,
                'description' => $o->description,
                'amount_idr' => $o->amount_idr,
                'status' => $o->status->value,
                'created_at' => optional($o->created_at)->toIso8601String(),
                'paid_at' => optional($o->paid_at)->toIso8601String(),
            ])->values(),
        ]);
    }

    public function checkout(Request $request, SubscriptionPlan $plan): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);
        abort_unless($plan->is_active, 404);

        $order = $this->billing->checkoutPlan($company, $request->user(), $plan);

        if ($order->status === OrderStatus::Paid) {
            return redirect()->route('employer.billing.show', ['order' => $order->reference])
                ->with('success', 'Paket gratis berhasil diaktifkan.');
        }

        if ($order->payment_url) {
            return redirect()->away($order->payment_url);
        }

        return redirect()->route('employer.billing.show', ['order' => $order->reference]);
    }

    public function show(Request $request, Order $order): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null && $order->company_id === $company->id, 403);

        $order->load('transactions');

        return Inertia::render('employer/billing/show', [
            'order' => [
                'reference' => $order->reference,
                'description' => $order->description,
                'amount_idr' => $order->amount_idr,
                'currency' => $order->currency,
                'status' => $order->status->value,
                'item_type' => $order->item_type->value,
                'payment_url' => $order->payment_url,
                'payment_reference' => $order->payment_reference,
                'created_at' => optional($order->created_at)->toIso8601String(),
                'paid_at' => optional($order->paid_at)->toIso8601String(),
                'expires_at' => optional($order->expires_at)->toIso8601String(),
            ],
            'transactions' => $order->transactions->map(fn ($t) => [
                'provider' => $t->provider,
                'gateway_reference' => $t->gateway_reference,
                'payment_method' => $t->payment_method,
                'amount_idr' => $t->amount_idr,
                'status' => $t->status?->value,
                'settled_at' => optional($t->settled_at)->toIso8601String(),
            ])->values(),
        ]);
    }

    private function resolveCompany(Request $request): ?Company
    {
        return Company::query()->where('owner_id', $request->user()->id)->first();
    }
}
