<?php

use App\Enums\ExperienceLevel;
use App\Enums\OrderStatus;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\SalarySubmission;
use App\Models\User;
use App\Services\SalaryInsight\SalaryInsightService;
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

function makeCompanyWithJobs(int $count = 5, array $overrides = []): array
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $jobs = Job::factory()->published()->count($count)->create(array_merge([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'salary_min' => 10000000,
        'salary_max' => 15000000,
    ], $overrides));

    return compact('owner', 'company', 'cat', 'jobs');
}

test('aggregate returns null stats when no data', function () {
    $stats = app(SalaryInsightService::class)->aggregate([]);
    expect($stats['sample_size'])->toBe(0);
    expect($stats['p50'])->toBeNull();
});

test('aggregate combines job posts and submissions', function () {
    ['cat' => $cat] = makeCompanyWithJobs(3);

    SalarySubmission::factory()->count(2)->create([
        'job_category_id' => $cat->id,
        'salary_idr' => 12000000,
        'experience_level' => ExperienceLevel::Mid,
        'status' => 'approved',
    ]);

    $stats = app(SalaryInsightService::class)->aggregate(['job_category_id' => $cat->id]);
    expect($stats['sample_size'])->toBe(5);
    expect($stats['posting_count'])->toBe(3);
    expect($stats['submission_count'])->toBe(2);
    expect($stats['p50'])->toBeGreaterThan(0);
});

test('aggregate ignores pending submissions', function () {
    ['cat' => $cat] = makeCompanyWithJobs(2);

    SalarySubmission::factory()->create([
        'job_category_id' => $cat->id,
        'status' => 'pending',
        'salary_idr' => 50000000,
    ]);

    $stats = app(SalaryInsightService::class)->aggregate(['job_category_id' => $cat->id]);
    expect($stats['submission_count'])->toBe(0);
});

test('aggregate filters by experience level', function () {
    ['cat' => $cat] = makeCompanyWithJobs(0);

    SalarySubmission::factory()->create([
        'job_category_id' => $cat->id,
        'experience_level' => ExperienceLevel::Senior,
        'salary_idr' => 30000000,
        'status' => 'approved',
    ]);
    SalarySubmission::factory()->create([
        'job_category_id' => $cat->id,
        'experience_level' => ExperienceLevel::Entry,
        'salary_idr' => 5000000,
        'status' => 'approved',
    ]);

    $senior = app(SalaryInsightService::class)->aggregate(['job_category_id' => $cat->id, 'experience_level' => 'senior']);
    expect($senior['submission_count'])->toBe(1);
    expect($senior['p50'])->toBe(30000000);
});

test('public salary insight page renders with filters', function () {
    makeCompanyWithJobs(2);

    $this->get('/salary-insight')->assertOk();
    $this->get('/salary-insight?experience_level=mid')->assertOk();
});

test('top companies returns ranked results', function () {
    ['company' => $companyA, 'cat' => $cat] = makeCompanyWithJobs(5);

    $ownerB = User::factory()->employer()->create();
    $companyB = Company::factory()->approved()->create(['owner_id' => $ownerB->id]);
    Job::factory()->published()->count(2)->create([
        'company_id' => $companyB->id,
        'posted_by_user_id' => $ownerB->id,
        'job_category_id' => $cat->id,
        'salary_min' => 5000000,
        'salary_max' => 10000000,
    ]);

    $top = app(SalaryInsightService::class)->topCompanies(['job_category_id' => $cat->id]);
    expect($top)->toHaveCount(2);
    expect($top[0]['count'])->toBe(5);
    expect($top[0]['slug'])->toBe($companyA->slug);
});

test('employee can submit salary', function () {
    $employee = User::factory()->employee()->create();
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();

    $this->actingAs($employee)
        ->post('/employee/salary-submissions', [
            'job_title' => 'Data Engineer',
            'job_category_id' => $cat->id,
            'experience_level' => 'mid',
            'experience_years' => 3,
            'employment_type' => 'full_time',
            'salary_idr' => 'Rp 18.000.000',
            'bonus_idr' => 'Rp 1.500.000',
            'is_anonymous' => true,
        ])
        ->assertRedirect();

    expect(SalarySubmission::query()->where('user_id', $employee->id)->count())->toBe(1);
    expect(SalarySubmission::query()->first()->status)->toBe('pending');
    expect(SalarySubmission::query()->first()->salary_idr)->toBe(18000000);
    expect(SalarySubmission::query()->first()->bonus_idr)->toBe(1500000);
});

test('employee can delete own submission', function () {
    $employee = User::factory()->employee()->create();
    $sub = SalarySubmission::factory()->create(['user_id' => $employee->id]);

    $this->actingAs($employee)
        ->delete("/employee/salary-submissions/{$sub->id}")
        ->assertRedirect();

    expect(SalarySubmission::query()->find($sub->id))->toBeNull();
});

test('employee cannot delete another user submission', function () {
    $owner = User::factory()->employee()->create();
    $intruder = User::factory()->employee()->create();
    $sub = SalarySubmission::factory()->create(['user_id' => $owner->id]);

    $this->actingAs($intruder)
        ->delete("/employee/salary-submissions/{$sub->id}")
        ->assertForbidden();

    expect(SalarySubmission::query()->find($sub->id))->not->toBeNull();
});

test('admin can view orders index', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get('/admin/orders')->assertOk();
});

test('admin orders index totals reflect paid orders', function () {
    $admin = User::factory()->admin()->create();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    Order::factory()->paid()->create([
        'company_id' => $company->id,
        'user_id' => $owner->id,
        'amount_idr' => 499000,
    ]);
    Order::factory()->create([
        'company_id' => $company->id,
        'user_id' => $owner->id,
        'amount_idr' => 199000,
        'status' => OrderStatus::AwaitingPayment,
    ]);

    $this->actingAs($admin)
        ->get('/admin/orders')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('totals.paid_count', 1)
            ->where('totals.paid_amount', 499000)
            ->where('totals.awaiting_count', 1)
        );
});

test('admin can view order detail with transactions', function () {
    $admin = User::factory()->admin()->create();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $order = Order::factory()->paid()->create([
        'company_id' => $company->id,
        'user_id' => $owner->id,
    ]);
    PaymentTransaction::factory()->create(['order_id' => $order->id]);

    $this->actingAs($admin)
        ->get("/admin/orders/{$order->reference}")
        ->assertOk();
});

test('non-admin cannot access admin orders', function () {
    $employee = User::factory()->employee()->create();
    $this->actingAs($employee)->get('/admin/orders')->assertForbidden();
});
