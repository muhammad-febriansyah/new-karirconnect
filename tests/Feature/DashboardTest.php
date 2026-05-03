<?php

use App\Enums\ApplicationStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Application;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\Order;
use App\Models\SubscriptionPlan;
use App\Models\User;
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

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('employee dashboard renders employee role-specific component', function () {
    $user = User::factory()->employee()->create();
    EmployeeProfile::factory()->create(['user_id' => $user->id, 'profile_completion' => 60]);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboards/employee')
            ->where('data.profile.completion', 60)
        );
});

test('employer dashboard renders employer role-specific component', function () {
    $owner = User::factory()->employer()->create();
    Company::factory()->approved()->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboards/employer')
            ->where('data.has_company', true)
        );
});

test('employer without company sees prompt', function () {
    $owner = User::factory()->employer()->create();

    $this->actingAs($owner)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('data.has_company', false));
});

test('admin dashboard renders admin role-specific component', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboards/admin')
            ->where('data.users.admin', 1)
        );
});

test('employee dashboard counts applications by status', function () {
    $user = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $user->id]);

    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job1 = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);
    $job2 = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);

    Application::factory()->create([
        'job_id' => $job1->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Submitted,
    ]);
    Application::factory()->create([
        'job_id' => $job2->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Hired,
    ]);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('data.applications.total', 2)
            ->where('data.applications.hired', 1)
            ->where('data.applications.in_progress', 1)
        );
});

test('employer dashboard reports billing usage', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $plan = SubscriptionPlan::query()->where('slug', 'starter')->first();

    CompanySubscription::factory()->create([
        'company_id' => $company->id,
        'plan_id' => $plan->id,
        'status' => SubscriptionStatus::Active,
        'starts_at' => now(),
        'ends_at' => now()->addDays(30),
        'jobs_posted_count' => 2,
        'featured_credits_remaining' => 1,
        'ai_credits_remaining' => 5,
    ]);

    Order::factory()->paid()->create([
        'company_id' => $company->id,
        'user_id' => $owner->id,
        'amount_idr' => 499000,
        'paid_at' => now(),
    ]);

    $this->actingAs($owner)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('data.billing.plan_name', $plan->name)
            ->where('data.billing.featured_remaining', 1)
            ->where('data.billing.paid_this_month', 499000)
        );
});

test('admin dashboard exposes platform-wide totals', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->employer()->count(2)->create();
    User::factory()->employee()->count(3)->create();

    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    Order::factory()->paid()->create([
        'company_id' => $company->id,
        'user_id' => $owner->id,
        'amount_idr' => 999000,
        'paid_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('data.users.admin', 1)
            ->where('data.users.employee', 3)
            ->where('data.orders.paid_count', 1)
            ->where('data.orders.paid_this_month', 999000)
        );
});
