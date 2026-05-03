<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SubscriptionTier;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SubscriptionPlanRequest;
use App\Models\SubscriptionPlan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionPlanController extends Controller
{
    public function index(Request $request): Response
    {
        $plans = SubscriptionPlan::query()
            ->orderBy('sort_order')
            ->orderBy('price_idr')
            ->get()
            ->map(fn (SubscriptionPlan $p) => $this->payload($p));

        return Inertia::render('admin/pricing-plans/index', [
            'plans' => $plans,
            'totals' => [
                'plans' => SubscriptionPlan::query()->count(),
                'active' => SubscriptionPlan::query()->where('is_active', true)->count(),
                'featured' => SubscriptionPlan::query()->where('is_featured', true)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/pricing-plans/form', [
            'mode' => 'create',
            'plan' => null,
            'tierOptions' => SubscriptionTier::selectItems(),
        ]);
    }

    public function store(SubscriptionPlanRequest $request): RedirectResponse
    {
        SubscriptionPlan::query()->create($request->validated());

        return to_route('admin.pricing-plans.index')->with('success', 'Paket dibuat.');
    }

    public function edit(SubscriptionPlan $plan): Response
    {
        return Inertia::render('admin/pricing-plans/form', [
            'mode' => 'edit',
            'plan' => $this->payload($plan),
            'tierOptions' => SubscriptionTier::selectItems(),
        ]);
    }

    public function update(SubscriptionPlanRequest $request, SubscriptionPlan $plan): RedirectResponse
    {
        $plan->update($request->validated());

        return to_route('admin.pricing-plans.index')->with('success', 'Paket diperbarui.');
    }

    public function destroy(SubscriptionPlan $plan): RedirectResponse
    {
        $plan->delete();

        return to_route('admin.pricing-plans.index')->with('success', 'Paket dihapus.');
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(SubscriptionPlan $plan): array
    {
        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'slug' => $plan->slug,
            'tier' => $plan->tier?->value,
            'price_idr' => $plan->price_idr,
            'billing_period_days' => $plan->billing_period_days,
            'job_post_quota' => $plan->job_post_quota,
            'featured_credits' => $plan->featured_credits,
            'ai_interview_credits' => $plan->ai_interview_credits,
            'features' => $plan->features ?? [],
            'is_active' => $plan->is_active,
            'is_featured' => $plan->is_featured,
            'sort_order' => $plan->sort_order,
        ];
    }
}
