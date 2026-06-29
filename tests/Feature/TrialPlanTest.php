<?php

use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Billing\BillingService;
use Database\Seeders\SubscriptionPlanSeeder;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    $this->seed(SubscriptionPlanSeeder::class);
});

test('grantTrial activates a 14-day trial subscription for an eligible company', function () {
    $company = Company::factory()->approved()->create();

    $subscription = app(BillingService::class)->grantTrial($company);

    expect($subscription)->not->toBeNull();
    expect($subscription->status)->toBe(SubscriptionStatus::Active);
    expect($subscription->plan->slug)->toBe('trial');
    expect($subscription->ends_at->startOfDay()->toDateString())
        ->toBe(now()->addDays(14)->startOfDay()->toDateString());
    expect($company->fresh()->trial_redeemed_at)->not->toBeNull();
});

test('grantTrial is one-time: a company that already redeemed cannot trial again', function () {
    $company = Company::factory()->approved()->create();

    app(BillingService::class)->grantTrial($company);
    $second = app(BillingService::class)->grantTrial($company->fresh());

    expect($second)->toBeNull();
    expect(CompanySubscription::query()->where('company_id', $company->id)->count())->toBe(1);
});

test('grantTrial no-ops when the company already has an active subscription', function () {
    $company = Company::factory()->approved()->create();
    $basic = SubscriptionPlan::query()->where('slug', 'basic')->first();

    CompanySubscription::factory()->create([
        'company_id' => $company->id,
        'plan_id' => $basic->id,
        'status' => SubscriptionStatus::Active,
        'starts_at' => now(),
        'ends_at' => now()->addDays(30),
    ]);

    $result = app(BillingService::class)->grantTrial($company);

    expect($result)->toBeNull();
    expect($company->fresh()->trial_redeemed_at)->toBeNull();
});

test('expire command marks lapsed subscriptions expired but leaves active ones', function () {
    $basic = SubscriptionPlan::query()->where('slug', 'basic')->first();

    $lapsed = CompanySubscription::factory()->create([
        'company_id' => Company::factory()->approved()->create()->id,
        'plan_id' => $basic->id,
        'status' => SubscriptionStatus::Active,
        'starts_at' => now()->subDays(40),
        'ends_at' => now()->subDay(),
    ]);

    $current = CompanySubscription::factory()->create([
        'company_id' => Company::factory()->approved()->create()->id,
        'plan_id' => $basic->id,
        'status' => SubscriptionStatus::Active,
        'starts_at' => now(),
        'ends_at' => now()->addDays(5),
    ]);

    $this->artisan('subscriptions:expire')->assertSuccessful();

    expect($lapsed->fresh()->status)->toBe(SubscriptionStatus::Expired);
    expect($current->fresh()->status)->toBe(SubscriptionStatus::Active);
});

test('finishing onboarding auto-activates the trial', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->post(route('employer.onboarding.finish'))
        ->assertRedirect(route('dashboard'));

    $subscription = $company->fresh()->activeSubscription();
    expect($subscription)->not->toBeNull();
    expect($subscription->plan->slug)->toBe('trial');
    expect($company->fresh()->trial_redeemed_at)->not->toBeNull();
});

test('billing page lists the trial plan and reflects an active trial', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    app(BillingService::class)->grantTrial($company);

    $this->actingAs($owner)
        ->get(route('employer.billing.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('employer/billing/index')
            ->where('currentSubscription.plan_tier', 'trial')
            ->where('plans', fn ($plans) => collect($plans)->pluck('slug')->contains('trial')
                && collect($plans)->pluck('slug')->contains('basic')
                && collect($plans)->pluck('slug')->contains('pro'))
        );
});
