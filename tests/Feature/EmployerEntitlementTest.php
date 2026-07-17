<?php

use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SubscriptionPlanSeeder;

beforeEach(function (): void {
    $this->seed([
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);
});

function jobPayload(): array
{
    return [
        'job_category_id' => JobCategory::query()->firstOrFail()->id,
        'title' => 'Backend Engineer',
        'slug' => 'backend-engineer',
        'description' => '<p>Bangun API.</p>',
        'responsibilities' => '<p>Maintain service.</p>',
        'requirements' => '<p>PHP, Laravel.</p>',
        'benefits' => '<p>Remote.</p>',
        'employment_type' => 'full_time',
        'work_arrangement' => 'remote',
        'experience_level' => 'mid',
        'min_education' => 's1',
        'salary_min' => 'Rp 10.000.000',
        'salary_max' => 'Rp 15.000.000',
        'is_salary_visible' => true,
        'province_id' => 1,
        'city_id' => 1,
        'status' => 'published',
        'application_deadline' => now()->addDays(20)->toDateString(),
        'is_anonymous' => false,
        'is_featured' => false,
        'ai_match_threshold' => 70,
        'auto_invite_ai_interview' => false,
        'skill_ids' => [],
    ];
}

function approvedEmployerWithCompany(): array
{
    $employer = User::factory()->employer()->create();
    $company = Company::factory()->for($employer, 'owner')->approved()->create();

    return [$employer, $company];
}

test('employer without an active subscription cannot post a job', function () {
    [$employer, $company] = approvedEmployerWithCompany();

    $this->actingAs($employer)
        ->post(route('employer.jobs.store'), jobPayload())
        ->assertSessionHas('error');

    expect(Job::query()->where('company_id', $company->id)->count())->toBe(0);
});

test('employer on an active plan can post and the quota counter increments', function () {
    [$employer, $company] = approvedEmployerWithCompany();
    $subscription = CompanySubscription::factory()->create([
        'company_id' => $company->id,
        'plan_id' => SubscriptionPlan::factory()->create(['job_post_quota' => 2])->id,
        'jobs_posted_count' => 0,
    ]);

    $this->actingAs($employer)
        ->post(route('employer.jobs.store'), jobPayload())
        ->assertRedirect();

    expect(Job::query()->where('company_id', $company->id)->count())->toBe(1);
    expect($subscription->fresh()->jobs_posted_count)->toBe(1);
});

test('employer cannot post once the plan quota is exhausted', function () {
    [$employer, $company] = approvedEmployerWithCompany();
    CompanySubscription::factory()->create([
        'company_id' => $company->id,
        'plan_id' => SubscriptionPlan::factory()->create(['job_post_quota' => 2])->id,
        'jobs_posted_count' => 2,
    ]);

    $this->actingAs($employer)
        ->post(route('employer.jobs.store'), jobPayload())
        ->assertSessionHas('error');

    expect(Job::query()->where('company_id', $company->id)->count())->toBe(0);
});

test('the trial plan cannot be purchased through the checkout route', function () {
    [$employer, $company] = approvedEmployerWithCompany();
    $this->seed(SubscriptionPlanSeeder::class);

    $this->actingAs($employer)
        ->post(route('employer.billing.checkout', ['plan' => 'trial']))
        ->assertSessionHas('error');

    expect($company->fresh()->subscriptions()->count())->toBe(0);
});

test('employer without an active subscription cannot start outreach to a candidate', function () {
    [$employer] = approvedEmployerWithCompany();
    $candidate = User::factory()->create();

    $this->actingAs($employer)
        ->post('/conversations/start', ['user_id' => $candidate->id])
        ->assertSessionHas('error');
});

test('employer with an active subscription can start outreach to a candidate', function () {
    [$employer, $company] = approvedEmployerWithCompany();
    CompanySubscription::factory()->create([
        'company_id' => $company->id,
        'plan_id' => SubscriptionPlan::factory()->create()->id,
    ]);
    $candidate = User::factory()->create();

    $response = $this->actingAs($employer)
        ->post('/conversations/start', ['user_id' => $candidate->id])
        ->assertRedirect();

    expect($response->headers->get('Location'))->toContain('/conversations/');
});
