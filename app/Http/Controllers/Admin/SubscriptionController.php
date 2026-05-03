<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\CompanySubscription;
use App\Models\Order;
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

    public function show(CompanySubscription $subscription): Response
    {
        $subscription->load([
            'company:id,name,slug,logo_path,verification_status,industry_id,city_id,company_size_id',
            'company.industry:id,name',
            'company.city:id,name',
            'company.size:id,name,employee_range',
            'plan',
        ]);

        $orders = Order::query()
            ->where('company_id', $subscription->company_id)
            ->where('item_type', 'subscription_plan')
            ->latest('created_at')
            ->limit(10)
            ->get(['id', 'reference', 'description', 'amount_idr', 'status', 'payment_provider', 'paid_at', 'created_at']);

        $plan = $subscription->plan;
        $jobQuota = $plan?->job_post_quota ?? 0;
        $jobsUsed = $subscription->jobs_posted_count;
        $featuredQuota = $plan?->featured_credits ?? 0;
        $featuredRemaining = $subscription->featured_credits_remaining;
        $aiQuota = $plan?->ai_interview_credits ?? 0;
        $aiRemaining = $subscription->ai_credits_remaining;

        $now = now();
        $totalDays = $subscription->starts_at && $subscription->ends_at
            ? max(1, $subscription->starts_at->diffInDays($subscription->ends_at))
            : 30;
        $elapsedDays = $subscription->starts_at
            ? max(0, min($totalDays, $subscription->starts_at->diffInDays($now)))
            : 0;
        $daysRemaining = $subscription->ends_at && $subscription->ends_at->isFuture()
            ? $subscription->ends_at->diffInDays($now)
            : 0;

        return Inertia::render('admin/subscriptions/show', [
            'subscription' => [
                'id' => $subscription->id,
                'status' => $subscription->status?->value,
                'starts_at' => optional($subscription->starts_at)->toIso8601String(),
                'ends_at' => optional($subscription->ends_at)->toIso8601String(),
                'cancelled_at' => optional($subscription->cancelled_at)->toIso8601String(),
                'auto_renew' => $subscription->auto_renew,
                'jobs_posted_count' => $jobsUsed,
                'featured_credits_remaining' => $featuredRemaining,
                'ai_credits_remaining' => $aiRemaining,
                'is_active' => $subscription->isActive(),
                'created_at' => optional($subscription->created_at)->toIso8601String(),
                'updated_at' => optional($subscription->updated_at)->toIso8601String(),
            ],
            'company' => [
                'id' => $subscription->company?->id,
                'name' => $subscription->company?->name,
                'slug' => $subscription->company?->slug,
                'logo_url' => $subscription->company?->logo_path ? asset('storage/'.$subscription->company->logo_path) : null,
                'verification_status' => $subscription->company?->verification_status?->value,
                'industry' => $subscription->company?->industry?->name,
                'city' => $subscription->company?->city?->name,
                'size' => $subscription->company?->size
                    ? "{$subscription->company->size->name} ({$subscription->company->size->employee_range})"
                    : null,
            ],
            'plan' => $plan ? [
                'id' => $plan->id,
                'name' => $plan->name,
                'slug' => $plan->slug,
                'tier' => $plan->tier?->value,
                'price_idr' => $plan->price_idr,
                'billing_period_days' => $plan->billing_period_days,
                'job_post_quota' => $jobQuota,
                'featured_credits' => $featuredQuota,
                'ai_interview_credits' => $aiQuota,
                'features' => $plan->features ?? [],
            ] : null,
            'usage' => [
                'jobs' => [
                    'used' => $jobsUsed,
                    'quota' => $jobQuota,
                    'percent' => $jobQuota > 0 ? min(100, round(($jobsUsed / $jobQuota) * 100)) : 0,
                ],
                'featured' => [
                    'used' => max(0, $featuredQuota - $featuredRemaining),
                    'remaining' => $featuredRemaining,
                    'quota' => $featuredQuota,
                    'percent' => $featuredQuota > 0 ? min(100, round(((max(0, $featuredQuota - $featuredRemaining)) / $featuredQuota) * 100)) : 0,
                ],
                'ai' => [
                    'used' => max(0, $aiQuota - $aiRemaining),
                    'remaining' => $aiRemaining,
                    'quota' => $aiQuota,
                    'percent' => $aiQuota > 0 ? min(100, round(((max(0, $aiQuota - $aiRemaining)) / $aiQuota) * 100)) : 0,
                ],
                'period' => [
                    'total_days' => (int) $totalDays,
                    'elapsed_days' => (int) $elapsedDays,
                    'days_remaining' => (int) $daysRemaining,
                    'percent' => $totalDays > 0 ? min(100, round(($elapsedDays / $totalDays) * 100)) : 0,
                ],
            ],
            'orders' => $orders->map(fn (Order $o): array => [
                'id' => $o->id,
                'reference' => $o->reference,
                'description' => $o->description,
                'amount_idr' => $o->amount_idr,
                'status' => $o->status?->value,
                'payment_provider' => $o->payment_provider,
                'paid_at' => optional($o->paid_at)->toIso8601String(),
                'created_at' => optional($o->created_at)->toIso8601String(),
            ])->all(),
        ]);
    }
}
