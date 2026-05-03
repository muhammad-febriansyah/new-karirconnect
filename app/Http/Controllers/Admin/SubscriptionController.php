<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\CompanySubscription;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function index(Request $request): Response
    {
        $statusFilter = $request->string('status')->toString();
        $search = $request->string('search')->toString();

        $subscriptions = CompanySubscription::query()
            ->with(['company:id,name,slug,logo_path', 'plan:id,name,slug,tier,price_idr'])
            ->when($statusFilter !== '', fn ($q) => $q->where('status', $statusFilter))
            ->when($search !== '', function ($q) use ($search): void {
                $q->whereHas('company', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            })
            ->latest('starts_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (CompanySubscription $s) => [
                'id' => $s->id,
                'status' => $s->status?->value,
                'starts_at' => optional($s->starts_at)->toIso8601String(),
                'ends_at' => optional($s->ends_at)->toIso8601String(),
                'cancelled_at' => optional($s->cancelled_at)->toIso8601String(),
                'auto_renew' => $s->auto_renew,
                'jobs_posted_count' => $s->jobs_posted_count,
                'featured_credits_remaining' => $s->featured_credits_remaining,
                'ai_credits_remaining' => $s->ai_credits_remaining,
                'is_active' => $s->isActive(),
                'company' => [
                    'id' => $s->company?->id,
                    'name' => $s->company?->name,
                    'slug' => $s->company?->slug,
                    'logo_url' => $s->company?->logo_path ? asset('storage/'.$s->company->logo_path) : null,
                ],
                'plan' => [
                    'id' => $s->plan?->id,
                    'name' => $s->plan?->name,
                    'slug' => $s->plan?->slug,
                    'tier' => $s->plan?->tier?->value,
                    'price_idr' => $s->plan?->price_idr,
                ],
            ]);

        return Inertia::render('admin/subscriptions/index', [
            'subscriptions' => $subscriptions,
            'filters' => ['status' => $statusFilter, 'search' => $search],
            'statusOptions' => array_map(
                fn (SubscriptionStatus $s) => ['value' => $s->value, 'label' => ucfirst(str_replace('_', ' ', $s->value))],
                SubscriptionStatus::cases(),
            ),
            'totals' => [
                'total' => CompanySubscription::query()->count(),
                'active' => CompanySubscription::query()->where('status', SubscriptionStatus::Active)->count(),
                'cancelled' => CompanySubscription::query()->where('status', SubscriptionStatus::Cancelled)->count(),
                'mrr' => (int) CompanySubscription::query()
                    ->where('status', SubscriptionStatus::Active)
                    ->join('subscription_plans', 'subscription_plans.id', '=', 'company_subscriptions.plan_id')
                    ->where('subscription_plans.billing_period_days', '<=', 31)
                    ->sum('subscription_plans.price_idr'),
            ],
        ]);
    }
}
