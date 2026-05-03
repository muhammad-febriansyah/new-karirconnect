<?php

use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Models\CompanySubscription;
use App\Models\PaymentTransaction;
use App\Models\User;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class]);
});

test('non admin cannot access subscriptions admin', function () {
    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)
        ->get(route('admin.subscriptions.index'))
        ->assertForbidden();
});

test('admin sees subscriptions paginated with stats', function () {
    $admin = User::factory()->admin()->create();
    CompanySubscription::factory()->count(3)->create(['status' => SubscriptionStatus::Active]);
    CompanySubscription::factory()->create(['status' => SubscriptionStatus::Cancelled]);

    $this->actingAs($admin)
        ->get(route('admin.subscriptions.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/subscriptions/index')
            ->where('totals.total', 4)
            ->where('totals.active', 3)
            ->where('totals.cancelled', 1)
            ->has('subscriptions.data', 4));
});

test('admin can filter subscriptions by status', function () {
    $admin = User::factory()->admin()->create();
    CompanySubscription::factory()->count(2)->create(['status' => SubscriptionStatus::Active]);
    CompanySubscription::factory()->create(['status' => SubscriptionStatus::Cancelled]);

    $this->actingAs($admin)
        ->get(route('admin.subscriptions.index', ['status' => 'cancelled']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('subscriptions.data', 1));
});

test('non admin cannot access payments admin', function () {
    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)
        ->get(route('admin.payments.index'))
        ->assertForbidden();
});

test('admin sees payments paginated with stats', function () {
    $admin = User::factory()->admin()->create();
    PaymentTransaction::factory()->count(2)->create(['status' => PaymentStatus::Success, 'amount_idr' => 250000]);
    PaymentTransaction::factory()->create(['status' => PaymentStatus::Failed]);

    $this->actingAs($admin)
        ->get(route('admin.payments.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/payments/index')
            ->where('totals.total', 3)
            ->where('totals.success', 2)
            ->where('totals.failed', 1)
            ->where('totals.gross_idr', 500000)
            ->has('payments.data', 3));
});

test('admin can filter payments by status', function () {
    $admin = User::factory()->admin()->create();
    PaymentTransaction::factory()->count(2)->create(['status' => PaymentStatus::Success]);
    PaymentTransaction::factory()->create(['status' => PaymentStatus::Pending]);

    $this->actingAs($admin)
        ->get(route('admin.payments.index', ['status' => 'pending']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('payments.data', 1));
});
