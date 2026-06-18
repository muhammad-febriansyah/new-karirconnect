<?php

use App\Enums\OrderStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Billing\BillingService;
use App\Services\Billing\Clients\FakeMidtransClient;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Database\Seeders\SubscriptionPlanSeeder;

beforeEach(function (): void {
    $this->seed([
        SettingSeeder::class,
        ProvinceCitySeeder::class,
        LookupSeeder::class,
        SubscriptionPlanSeeder::class,
    ]);
});

function makeBillingContext(): array
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    return compact('owner', 'company');
}

function makeFakeCallback(string $reference, int $amount, string $transactionStatus = 'settlement'): array
{
    /** @var FakeMidtransClient $client */
    $client = app(FakeMidtransClient::class);

    $statusCode = match ($transactionStatus) {
        'settlement', 'capture' => '200',
        'pending' => '201',
        'deny', 'cancel', 'failure' => '202',
        'expire' => '407',
        default => '500',
    };

    $grossAmount = number_format((float) $amount, 2, '.', '');

    return [
        'merchant_id' => 'FAKEMERCHANT',
        'order_id' => $reference,
        'transaction_id' => 'GW-'.$reference,
        'gross_amount' => $grossAmount,
        'currency' => 'IDR',
        'transaction_status' => $transactionStatus,
        'status_code' => $statusCode,
        'fraud_status' => 'accept',
        'payment_type' => 'bank_transfer',
        'signature_key' => $client->expectedSignature($reference, $statusCode, $grossAmount),
    ];
}

test('paid plan checkout creates pending order with payment url', function () {
    ['owner' => $owner, 'company' => $company] = makeBillingContext();
    $plan = SubscriptionPlan::query()->where('slug', 'basic')->first();

    $order = app(BillingService::class)->checkoutPlan($company, $owner, $plan);

    expect($order->status)->toBe(OrderStatus::AwaitingPayment);
    expect($order->amount_idr)->toBe($plan->price_idr);
    expect($order->payment_url)->not->toBeNull();
    expect($order->transactions()->count())->toBe(1);
});

test('free plan checkout activates subscription immediately', function () {
    ['owner' => $owner, 'company' => $company] = makeBillingContext();
    $plan = SubscriptionPlan::factory()->create(['slug' => 'free', 'price_idr' => 0]);

    $order = app(BillingService::class)->checkoutPlan($company, $owner, $plan);

    expect($order->status)->toBe(OrderStatus::Paid);
    $sub = CompanySubscription::query()->where('company_id', $company->id)->first();
    expect($sub)->not->toBeNull();
    expect($sub->status)->toBe(SubscriptionStatus::Active);
});

test('valid midtrans callback marks order paid and activates plan', function () {
    ['owner' => $owner, 'company' => $company] = makeBillingContext();
    $plan = SubscriptionPlan::query()->where('slug', 'basic')->first();
    $order = app(BillingService::class)->checkoutPlan($company, $owner, $plan);

    $payload = makeFakeCallback($order->reference, $order->amount_idr);

    $this->post(route('payments.midtrans.notification'), $payload)
        ->assertOk()
        ->assertJson(['status' => 'ok', 'order_status' => 'paid']);

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Paid);
    expect($order->paid_at)->not->toBeNull();

    $sub = CompanySubscription::query()->where('company_id', $company->id)->where('status', SubscriptionStatus::Active)->first();
    expect($sub)->not->toBeNull();
    expect($sub->plan_id)->toBe($plan->id);
    expect($sub->featured_credits_remaining)->toBe($plan->featured_credits);
});

test('invalid signature is rejected and order stays awaiting', function () {
    ['owner' => $owner, 'company' => $company] = makeBillingContext();
    $plan = SubscriptionPlan::query()->where('slug', 'basic')->first();
    $order = app(BillingService::class)->checkoutPlan($company, $owner, $plan);

    $payload = makeFakeCallback($order->reference, $order->amount_idr);
    $payload['signature_key'] = 'tampered-signature';

    $this->post(route('payments.midtrans.notification'), $payload)
        ->assertStatus(401)
        ->assertJson(['status' => 'invalid_signature']);

    expect($order->fresh()->status)->toBe(OrderStatus::AwaitingPayment);
    expect(CompanySubscription::query()->count())->toBe(0);
});

test('amount mismatch is rejected with 422 and no entitlement applied', function () {
    ['owner' => $owner, 'company' => $company] = makeBillingContext();
    $plan = SubscriptionPlan::query()->where('slug', 'basic')->first();
    $order = app(BillingService::class)->checkoutPlan($company, $owner, $plan);

    // Build payload with a different amount but signature that verifies for the
    // tampered amount. Real attacker without API key can't do this, but a buggy
    // gateway sending wrong amount would be caught by this defense-in-depth.
    $tamperedAmount = $order->amount_idr + 1;
    $payload = makeFakeCallback($order->reference, $tamperedAmount);
    $payload['gross_amount'] = number_format((float) $tamperedAmount, 2, '.', '');

    $this->post(route('payments.midtrans.notification'), $payload)
        ->assertStatus(422)
        ->assertJson(['status' => 'amount_mismatch']);

    expect($order->fresh()->status)->toBe(OrderStatus::AwaitingPayment);
    expect(CompanySubscription::query()->count())->toBe(0);
});

test('unknown order reference returns 404', function () {
    $payload = makeFakeCallback('UNKNOWN-REF-9999', 100000);

    $this->post(route('payments.midtrans.notification'), $payload)
        ->assertStatus(404)
        ->assertJson(['status' => 'order_not_found']);
});

test('replaying same callback does not double-apply entitlement', function () {
    ['owner' => $owner, 'company' => $company] = makeBillingContext();
    $plan = SubscriptionPlan::query()->where('slug', 'basic')->first();
    $order = app(BillingService::class)->checkoutPlan($company, $owner, $plan);

    $payload = makeFakeCallback($order->reference, $order->amount_idr);

    $this->post(route('payments.midtrans.notification'), $payload)->assertOk();
    $this->post(route('payments.midtrans.notification'), $payload)->assertOk();

    expect(CompanySubscription::query()->where('company_id', $company->id)->where('status', SubscriptionStatus::Active)->count())
        ->toBe(1);
});

test('failed callback marks order failed and creates no subscription', function () {
    ['owner' => $owner, 'company' => $company] = makeBillingContext();
    $plan = SubscriptionPlan::query()->where('slug', 'basic')->first();
    $order = app(BillingService::class)->checkoutPlan($company, $owner, $plan);

    $payload = makeFakeCallback($order->reference, $order->amount_idr, 'deny');

    $this->post(route('payments.midtrans.notification'), $payload)->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Failed);
    expect(CompanySubscription::query()->where('company_id', $company->id)->count())->toBe(0);
    $tx = PaymentTransaction::query()->where('order_id', $order->id)->orderByDesc('id')->first();
    expect($tx->status?->value)->toBe('failed');
});

test('job boost order marks job featured after successful payment', function () {
    ['owner' => $owner, 'company' => $company] = makeBillingContext();
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'is_featured' => false,
    ]);

    $order = app(BillingService::class)->checkoutJobBoost($company, $owner, $job, 199000, 30);

    $this->post(route('payments.midtrans.notification'), makeFakeCallback($order->reference, $order->amount_idr))->assertOk();

    $job->refresh();
    expect($job->is_featured)->toBeTrue();
    expect($job->featured_until)->not->toBeNull();
    expect($job->featured_until->isFuture())->toBeTrue();
});

test('employer can view billing index with their plans and orders', function () {
    ['owner' => $owner, 'company' => $company] = makeBillingContext();
    $plan = SubscriptionPlan::query()->where('slug', 'basic')->first();
    app(BillingService::class)->checkoutPlan($company, $owner, $plan);

    $this->actingAs($owner)
        ->get(route('employer.billing.index'))
        ->assertOk();
});

test('employer cannot view another company order detail', function () {
    ['owner' => $owner, 'company' => $company] = makeBillingContext();
    $plan = SubscriptionPlan::query()->where('slug', 'basic')->first();
    $order = app(BillingService::class)->checkoutPlan($company, $owner, $plan);

    $other = User::factory()->employer()->create();
    Company::factory()->approved()->create(['owner_id' => $other->id]);

    $this->actingAs($other)
        ->get(route('employer.billing.show', ['order' => $order->reference]))
        ->assertForbidden();
});

test('checkout endpoint redirects to gateway payment url', function () {
    ['owner' => $owner] = makeBillingContext();
    $plan = SubscriptionPlan::query()->where('slug', 'basic')->first();

    $response = $this->actingAs($owner)
        ->post(route('employer.billing.checkout', ['plan' => $plan->slug]));

    $response->assertRedirect();
    expect($response->headers->get('Location'))->toContain('sandbox.midtrans.test');
    expect(Order::query()->count())->toBe(1);
});

test('employer cannot boost job belonging to another company', function () {
    ['owner' => $owner, 'company' => $company] = makeBillingContext();
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);

    $intruder = User::factory()->employer()->create();
    Company::factory()->approved()->create(['owner_id' => $intruder->id]);

    $this->actingAs($intruder)
        ->post(route('employer.jobs.boost', ['job' => $job->slug]))
        ->assertForbidden();
});
