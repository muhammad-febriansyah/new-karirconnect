<?php

use App\Enums\JobStatus;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\Skill;
use App\Models\User;
use App\Services\Jobs\JobMatchingService;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([
        SettingSeeder::class,
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);
});

test('public job browse only lists published jobs', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();

    Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'title' => 'Senior Backend Engineer',
    ]);
    Job::factory()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'title' => 'Draft Position Internal',
        'status' => JobStatus::Draft,
    ]);

    $this->get(route('public.jobs.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('public/jobs/index')
            ->where('jobs.total', 1)
            ->where('jobs.data.0.title', 'Senior Backend Engineer'));
});

test('public job browse search matches title and company name', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id, 'name' => 'PT Karir Maju']);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();

    Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'title' => 'React Engineer',
    ]);
    Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'title' => 'Marketing Lead',
    ]);

    $this->get(route('public.jobs.index', ['search' => 'react']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('jobs.total', 1));
});

test('public job show increments views and renders detail', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'title' => 'Full Stack Developer',
    ]);

    $this->get(route('public.jobs.show', ['job' => $job->slug]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('public/jobs/show')
            ->where('job.title', 'Full Stack Developer'));

    expect($job->fresh()->views_count)->toBe(1);
});

test('draft jobs are not accessible via public show', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'status' => JobStatus::Draft,
    ]);

    $this->get(route('public.jobs.show', ['job' => $job->slug]))->assertNotFound();
});

test('public companies index lists only approved companies', function () {
    $owner = User::factory()->employer()->create();
    Company::factory()->approved()->create(['owner_id' => $owner->id, 'name' => 'PT Approved Co']);
    Company::factory()->create(['owner_id' => $owner->id, 'name' => 'PT Pending Co']);

    $this->get(route('public.companies.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('public/companies/index')
            ->where('companies.total', 1));
});

test('employee can save and unsave a published job', function () {
    $employee = User::factory()->employee()->create();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);

    $this->actingAs($employee)
        ->post(route('employee.saved-jobs.store', ['job' => $job->slug]))
        ->assertRedirect();

    expect($employee->savedJobs()->where('job_id', $job->id)->exists())->toBeTrue();

    $this->actingAs($employee)
        ->delete(route('employee.saved-jobs.destroy', ['job' => $job->slug]))
        ->assertRedirect();

    expect($employee->savedJobs()->where('job_id', $job->id)->exists())->toBeFalse();
});

test('saving a draft job is blocked', function () {
    $employee = User::factory()->employee()->create();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'status' => JobStatus::Draft,
    ]);

    $this->actingAs($employee)
        ->post(route('employee.saved-jobs.store', ['job' => $job->slug]))
        ->assertStatus(422);
});

test('saved jobs index renders for employee', function () {
    $employee = User::factory()->employee()->create();

    $this->actingAs($employee)
        ->get(route('employee.saved-jobs.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('employee/saved-jobs/index'));
});

test('admin job index lists all jobs regardless of status', function () {
    $admin = User::factory()->admin()->create();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();

    Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);
    Job::factory()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'status' => JobStatus::Draft,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.jobs.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/jobs/index')
            ->where('jobs.total', 2));
});

test('non admin cannot access admin jobs', function () {
    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)
        ->get(route('admin.jobs.index'))
        ->assertForbidden();
});

test('JobMatchingService produces score with skill overlap', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $skills = Skill::query()->limit(3)->get();
    if ($skills->count() < 3) {
        $skills = collect([
            Skill::query()->updateOrCreate(['slug' => 'sprint4-skill-a'], ['name' => 'Sprint4 Skill A', 'category' => 'Backend', 'is_active' => true]),
            Skill::query()->updateOrCreate(['slug' => 'sprint4-skill-b'], ['name' => 'Sprint4 Skill B', 'category' => 'Backend', 'is_active' => true]),
            Skill::query()->updateOrCreate(['slug' => 'sprint4-skill-c'], ['name' => 'Sprint4 Skill C', 'category' => 'Backend', 'is_active' => true]),
        ]);
    }

    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'salary_min' => 10_000_000,
        'salary_max' => 15_000_000,
    ]);
    $job->skills()->sync($skills->pluck('id')->mapWithKeys(fn ($id) => [$id => ['proficiency' => 'mid', 'is_required' => false]])->all());

    $employee = User::factory()->employee()->create();
    $profile = $employee->employeeProfile()->create([
        'visibility' => 'public',
        'is_open_to_work' => true,
        'expected_salary_min' => 11_000_000,
        'expected_salary_max' => 14_000_000,
        'experience_level' => 'mid',
    ]);
    $profile->skills()->sync($skills->take(2)->pluck('id'));

    $score = app(JobMatchingService::class)->score($job->fresh(), $profile->fresh());

    expect($score)->toBeGreaterThan(0)->toBeLessThanOrEqual(100);
});
