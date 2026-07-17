<?php

use App\Models\CompanySubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class]);
});

test('non admin cannot access pricing plans admin', function () {
    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)
        ->get(route('admin.pricing-plans.index'))
        ->assertForbidden();
});

test('admin can list pricing plans with stats', function () {
    $admin = User::factory()->admin()->create();
    SubscriptionPlan::factory()->count(3)->create();
    SubscriptionPlan::factory()->create(['is_active' => false]);
    SubscriptionPlan::factory()->create(['is_featured' => true]);

    // Counted, not hardcoded: the Trial plan arrives from a data migration
    // (seed_trial_subscription_plan), so the listing holds the five created
    // here plus whatever the migrations seeded. Pinning a literal made this
    // assertion go stale the moment that migration was added.
    $expected = SubscriptionPlan::query()->count();

    $this->actingAs($admin)
        ->get(route('admin.pricing-plans.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/pricing-plans/index')
            ->where('totals.plans', $expected)
            ->has('plans', $expected));
});

test('admin can create a new pricing plan', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post(route('admin.pricing-plans.store'), [
            'name' => 'Pro Bulanan',
            'slug' => 'pro-bulanan',
            'tier' => 'pro',
            'price_idr' => 500000,
            'billing_period_days' => 30,
            'job_post_quota' => 20,
            'featured_credits' => 5,
            'ai_interview_credits' => 10,
            'features' => ['Akses talent search', 'AI interview tanpa batas'],
            'is_active' => true,
            'is_featured' => false,
            'sort_order' => 1,
        ])
        ->assertRedirect(route('admin.pricing-plans.index'));

    $plan = SubscriptionPlan::query()->where('slug', 'pro-bulanan')->firstOrFail();

    expect($plan->name)->toBe('Pro Bulanan')
        ->and($plan->price_idr)->toBe(500000)
        ->and($plan->features)->toBe(['Akses talent search', 'AI interview tanpa batas']);
});

test('slug must be unique on create', function () {
    $admin = User::factory()->admin()->create();
    SubscriptionPlan::factory()->create(['slug' => 'duplicate']);

    $this->actingAs($admin)
        ->post(route('admin.pricing-plans.store'), [
            'name' => 'Another',
            'slug' => 'duplicate',
            'tier' => 'starter',
            'price_idr' => 0,
            'billing_period_days' => 30,
            'job_post_quota' => 0,
            'featured_credits' => 0,
            'ai_interview_credits' => 0,
            'is_active' => true,
            'is_featured' => false,
            'sort_order' => 0,
        ])
        ->assertSessionHasErrors('slug');
});

test('admin can edit pricing plan page', function () {
    $admin = User::factory()->admin()->create();
    $plan = SubscriptionPlan::factory()->create(['slug' => 'edit-test']);

    $this->actingAs($admin)
        ->get('/admin/pricing-plans/edit-test/edit')
        ->assertOk();
});

test('admin can update and delete a pricing plan', function () {
    $admin = User::factory()->admin()->create();
    $plan = SubscriptionPlan::factory()->create(['name' => 'Old', 'slug' => 'old-slug-test']);

    $this->actingAs($admin)
        ->patch('/admin/pricing-plans/old-slug-test', [
            'name' => 'New',
            'slug' => 'new-slug-test',
            'tier' => $plan->tier->value,
            'price_idr' => $plan->price_idr,
            'billing_period_days' => $plan->billing_period_days,
            'job_post_quota' => $plan->job_post_quota,
            'featured_credits' => $plan->featured_credits,
            'ai_interview_credits' => $plan->ai_interview_credits,
            'is_active' => true,
            'is_featured' => false,
            'sort_order' => 0,
        ])
        ->assertRedirect();

    expect($plan->fresh()->slug)->toBe('new-slug-test');

    $this->actingAs($admin)
        ->delete('/admin/pricing-plans/new-slug-test')
        ->assertRedirect();

    expect(SubscriptionPlan::query()->whereKey($plan->id)->exists())->toBeFalse();
});

test('cannot delete a pricing plan that is still in use by a company subscription', function () {
    $admin = User::factory()->admin()->create();
    $plan = SubscriptionPlan::factory()->create(['slug' => 'in-use-test']);
    CompanySubscription::factory()->create(['plan_id' => $plan->id]);

    $this->actingAs($admin)
        ->delete('/admin/pricing-plans/in-use-test')
        ->assertRedirect()
        ->assertSessionHas('error');

    expect(SubscriptionPlan::query()->whereKey($plan->id)->exists())->toBeTrue();
});
