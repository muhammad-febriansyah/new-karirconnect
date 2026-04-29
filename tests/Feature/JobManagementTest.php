<?php

use App\Enums\JobStatus;
use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\JobScreeningQuestion;
use App\Models\Skill;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed([
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);
});

test('employer can manage jobs and screening questions', function () {
    $employer = User::factory()->employer()->create([
        'email_verified_at' => now(),
    ]);

    $company = Company::factory()->for($employer, 'owner')->create();
    CompanyMember::factory()->owner()->create([
        'company_id' => $company->id,
        'user_id' => $employer->id,
    ]);

    $category = JobCategory::query()->firstOrFail();
    $skills = Skill::query()->take(2)->get();

    $this->actingAs($employer)
        ->post(route('employer.jobs.store'), [
            'job_category_id' => $category->id,
            'title' => 'Senior Laravel Engineer',
            'slug' => 'senior-laravel-engineer',
            'description' => '<p>Membangun modul hiring.</p>',
            'responsibilities' => '<p>Maintain backend.</p>',
            'requirements' => '<p>Laravel, React.</p>',
            'benefits' => '<p>WFH hybrid.</p>',
            'employment_type' => 'full_time',
            'work_arrangement' => 'hybrid',
            'experience_level' => 'senior',
            'min_education' => 's1',
            'salary_min' => 12000000,
            'salary_max' => 18000000,
            'is_salary_visible' => true,
            'province_id' => 1,
            'city_id' => 1,
            'status' => 'published',
            'application_deadline' => now()->addDays(20)->toDateString(),
            'is_anonymous' => false,
            'is_featured' => true,
            'ai_match_threshold' => 75,
            'auto_invite_ai_interview' => true,
            'skill_ids' => $skills->pluck('id')->all(),
        ])
        ->assertRedirect();

    $job = Job::query()->firstOrFail();

    expect($job->company_id)->toBe($company->id)
        ->and($job->status)->toBe(JobStatus::Published)
        ->and($job->published_at)->not->toBeNull();

    expect($job->skills()->count())->toBe(2);

    $this->actingAs($employer)
        ->get(route('employer.jobs.show', $job))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('employer/jobs/show')
            ->where('job.title', 'Senior Laravel Engineer'));

    $this->actingAs($employer)
        ->post(route('employer.jobs.screening-questions.store', $job), [
            'question' => 'Berapa tahun pengalaman Laravel Anda?',
            'type' => 'number',
            'options_text' => '',
            'knockout_value_text' => '0',
            'is_required' => true,
            'order_number' => 1,
        ])
        ->assertRedirect(route('employer.jobs.show', $job));

    $question = JobScreeningQuestion::query()->firstOrFail();

    $this->actingAs($employer)
        ->put(route('employer.jobs.screening-questions.update', [$job, $question]), [
            'question' => 'Berapa tahun pengalaman Laravel dan Inertia Anda?',
            'type' => 'text',
            'options_text' => '',
            'knockout_value_text' => '',
            'is_required' => false,
            'order_number' => 2,
        ])
        ->assertRedirect(route('employer.jobs.show', $job));

    expect($question->fresh()->order_number)->toBe(2);

    $this->actingAs($employer)
        ->patch(route('employer.jobs.update', $job), [
            'job_category_id' => $category->id,
            'title' => 'Lead Laravel Engineer',
            'slug' => 'lead-laravel-engineer',
            'description' => '<p>Updated description.</p>',
            'responsibilities' => '<p>Lead backend team.</p>',
            'requirements' => '<p>Laravel, React, leadership.</p>',
            'benefits' => '<p>Remote budget.</p>',
            'employment_type' => 'full_time',
            'work_arrangement' => 'remote',
            'experience_level' => 'lead',
            'min_education' => 's1',
            'salary_min' => 15000000,
            'salary_max' => 22000000,
            'is_salary_visible' => true,
            'province_id' => 1,
            'city_id' => 1,
            'status' => 'closed',
            'application_deadline' => now()->addDays(10)->toDateString(),
            'is_anonymous' => false,
            'is_featured' => false,
            'ai_match_threshold' => 80,
            'auto_invite_ai_interview' => false,
            'skill_ids' => [$skills->first()->id],
        ])
        ->assertRedirect(route('employer.jobs.show', ['job' => 'lead-laravel-engineer']));

    $job->refresh();

    expect($job->slug)->toBe('lead-laravel-engineer')
        ->and($job->status)->toBe(JobStatus::Closed)
        ->and($job->closed_at)->not->toBeNull();

    expect($job->skills()->count())->toBe(1);
});

test('employee can save and remove published jobs', function () {
    $employee = User::factory()->employee()->create([
        'email_verified_at' => now(),
    ]);
    $employer = User::factory()->employer()->create([
        'email_verified_at' => now(),
    ]);

    $company = Company::factory()->for($employer, 'owner')->create();
    $job = Job::factory()->for($company)->for($employer, 'postedBy')->published()->create();

    $this->actingAs($employee)
        ->post(route('employee.saved-jobs.store', $job))
        ->assertRedirect();

    $this->assertDatabaseHas('saved_jobs', [
        'user_id' => $employee->id,
        'job_id' => $job->id,
    ]);

    $this->actingAs($employee)
        ->get(route('employee.saved-jobs.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('employee/saved-jobs/index')
            ->has('items', 1));

    $this->actingAs($employee)
        ->delete(route('employee.saved-jobs.destroy', $job))
        ->assertRedirect();

    $this->assertDatabaseMissing('saved_jobs', [
        'user_id' => $employee->id,
        'job_id' => $job->id,
    ]);
});

test('admin can browse and moderate jobs', function () {
    $admin = User::factory()->admin()->create([
        'email_verified_at' => now(),
    ]);
    $employer = User::factory()->employer()->create([
        'email_verified_at' => now(),
    ]);

    $company = Company::factory()->for($employer, 'owner')->create();
    $job = Job::factory()->for($company)->for($employer, 'postedBy')->published()->create([
        'title' => 'Platform Engineer',
        'slug' => 'platform-engineer',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.jobs.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/jobs/index'));

    $this->actingAs($admin)
        ->get(route('admin.jobs.show', $job))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/jobs/show')
            ->where('job.title', 'Platform Engineer'));

    $this->actingAs($admin)
        ->patch(route('admin.jobs.update', $job), [
            'status' => 'archived',
            'is_featured' => true,
        ])
        ->assertRedirect();

    $job->refresh();

    expect($job->status)->toBe(JobStatus::Archived)
        ->and($job->is_featured)->toBeTrue()
        ->and($job->featured_until)->not->toBeNull();
});
