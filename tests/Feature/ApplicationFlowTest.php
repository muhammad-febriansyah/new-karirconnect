<?php

use App\Enums\ApplicationStatus;
use App\Enums\JobStatus;
use App\Enums\UserRole;
use App\Models\AiInterviewSession;
use App\Models\AiMatchScore;
use App\Models\Application;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
use App\Notifications\AiInterviewInvitationNotification;
use App\Notifications\ApplicationStatusChangedNotification;
use App\Notifications\ApplicationSubmittedNotification;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function (): void {
    $this->seed([
        SettingSeeder::class,
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);
});

function makePublishedJob(?User $owner = null): Job
{
    $owner ??= User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();

    return Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);
}

function makeReadyEmployee(): User
{
    $employee = User::factory()->employee()->create();
    EmployeeProfile::factory()->create(['user_id' => $employee->id, 'profile_completion' => 80]);

    return $employee;
}

test('employee can submit application and employer is notified', function () {
    Notification::fake();

    $employee = makeReadyEmployee();
    $owner = User::factory()->employer()->create();
    $job = makePublishedJob($owner);

    $this->actingAs($employee)
        ->post(route('public.jobs.apply.store', ['job' => $job->slug]), [
            'cover_letter' => 'Saya tertarik dengan posisi ini.',
            'expected_salary' => 'Rp 12.000.000',
        ])
        ->assertRedirect(route('employee.applications.index'));

    $application = Application::query()->first();
    expect($application)->not->toBeNull();
    expect($application->status)->toBe(ApplicationStatus::Submitted);
    expect($application->cover_letter)->toBe('Saya tertarik dengan posisi ini.');
    expect($application->expected_salary)->toBe(12_000_000);
    expect($application->statusLogs()->count())->toBe(1);
    expect($job->fresh()->applications_count)->toBe(1);

    Notification::assertSentTo($owner, ApplicationSubmittedNotification::class);
});

test('match score is computed on submit', function () {
    $employee = makeReadyEmployee();
    $job = makePublishedJob();

    $this->actingAs($employee)
        ->post(route('public.jobs.apply.store', ['job' => $job->slug]), [
            'cover_letter' => 'Halo',
        ])
        ->assertRedirect();

    $application = Application::query()->first();
    expect($application->ai_match_score)->not->toBeNull();
    expect($application->ai_match_score)->toBeGreaterThanOrEqual(0);
    expect($application->ai_match_score)->toBeLessThanOrEqual(100);
});

test('cannot apply when profile completion is below 60 percent', function () {
    $employee = User::factory()->employee()->create();
    EmployeeProfile::factory()->create(['user_id' => $employee->id, 'profile_completion' => 30]);
    $job = makePublishedJob();

    $this->actingAs($employee)
        ->post(route('public.jobs.apply.store', ['job' => $job->slug]), ['cover_letter' => 'Halo'])
        ->assertSessionHasErrors('profile');

    expect(Application::query()->count())->toBe(0);
});

test('cannot apply twice to the same job', function () {
    $employee = makeReadyEmployee();
    $job = makePublishedJob();

    $this->actingAs($employee)
        ->post(route('public.jobs.apply.store', ['job' => $job->slug]), ['cover_letter' => 'Once'])
        ->assertRedirect();

    $this->actingAs($employee)
        ->post(route('public.jobs.apply.store', ['job' => $job->slug]), ['cover_letter' => 'Twice'])
        ->assertSessionHasErrors('job');

    expect(Application::query()->count())->toBe(1);
});

test('cannot apply to draft jobs', function () {
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
        ->post(route('public.jobs.apply.store', ['job' => $job->slug]), [])
        ->assertSessionHasErrors('job');
});

test('owner cannot apply to their own company job', function () {
    $employer = User::factory()->employer()->create();
    $job = makePublishedJob($employer);
    $employer->update(['role' => UserRole::Employee]);

    $this->actingAs($employer->fresh())
        ->post(route('public.jobs.apply.store', ['job' => $job->slug]), [])
        ->assertForbidden();
});

test('non employee cannot submit application', function () {
    $admin = User::factory()->admin()->create();
    $job = makePublishedJob();

    $this->actingAs($admin)
        ->post(route('public.jobs.apply.store', ['job' => $job->slug]), [])
        ->assertForbidden();
});

test('apply page renders for employee', function () {
    $employee = User::factory()->employee()->create();
    $job = makePublishedJob();

    $this->actingAs($employee)
        ->get(route('public.jobs.apply.create', ['job' => $job->slug]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('public/jobs/apply'));
});

test('employer can view applicant index for own jobs', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);
    $employee = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $employee->id]);
    Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
    ]);

    $this->actingAs($owner)
        ->get(route('employer.applicants.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('employer/applicants/index')
            ->where('applicants.total', 1));
});

test('employer cannot view another company applicants', function () {
    $ownerA = User::factory()->employer()->create();
    $ownerB = User::factory()->employer()->create();
    $companyA = Company::factory()->approved()->create(['owner_id' => $ownerA->id]);
    Company::factory()->approved()->create(['owner_id' => $ownerB->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $companyA->id,
        'posted_by_user_id' => $ownerA->id,
        'job_category_id' => $cat->id,
    ]);
    $employee = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $employee->id]);
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
    ]);

    $this->actingAs($ownerB)
        ->get(route('employer.applicants.show', ['application' => $application->id]))
        ->assertForbidden();
});

test('employer applicant detail exposes match breakdown when cached', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);
    $employee = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $employee->id]);
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
    ]);
    AiMatchScore::query()->create([
        'job_id' => $job->id,
        'candidate_profile_id' => $profile->id,
        'score' => 72,
        'breakdown' => ['skills' => 35, 'experience' => 15, 'location' => 12, 'salary' => 10],
        'computed_at' => now(),
    ]);

    $this->actingAs($owner)
        ->get(route('employer.applicants.show', ['application' => $application->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('employer/applicants/show')
            ->where('application.match_breakdown.skills', 35)
            ->where('application.match_breakdown.experience', 15)
            ->where('application.match_breakdown.location', 12)
            ->where('application.match_breakdown.salary', 10));
});

test('employer applicant detail returns null breakdown when none is cached', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);
    $employee = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $employee->id]);
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
    ]);
    AiMatchScore::query()->where('job_id', $job->id)->where('candidate_profile_id', $profile->id)->delete();

    $this->actingAs($owner)
        ->get(route('employer.applicants.show', ['application' => $application->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('application.match_breakdown', null));
});

test('employer can change application status and candidate is notified', function () {
    Notification::fake();

    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);
    $employee = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $employee->id]);
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
    ]);

    $this->actingAs($owner)
        ->post(route('employer.applicants.status', ['application' => $application->id]), [
            'status' => 'shortlisted',
            'note' => 'Profile cocok untuk tahap wawancara.',
        ])
        ->assertRedirect();

    $application->refresh();
    expect($application->status)->toBe(ApplicationStatus::Shortlisted);
    expect($application->statusLogs()->count())->toBe(1);

    Notification::assertSentTo($employee, ApplicationStatusChangedNotification::class);
});

test('employee applications index shows their own submissions', function () {
    $employee = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $employee->id]);
    $job = makePublishedJob();
    Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
    ]);

    $this->actingAs($employee)
        ->get(route('employee.applications.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('employee/applications/index')
            ->where('applications.total', 1));
});

test('auto-invite: AI interview session is created and candidate notified when job opts in', function () {
    Notification::fake();

    $employee = makeReadyEmployee();
    $owner = User::factory()->employer()->create();
    $job = makePublishedJob($owner);
    $job->forceFill([
        'auto_invite_ai_interview' => true,
        'ai_match_threshold' => 0,
    ])->save();

    $this->actingAs($employee)
        ->post(route('public.jobs.apply.store', ['job' => $job->slug]), [
            'cover_letter' => 'Saya tertarik.',
        ])
        ->assertRedirect();

    $application = Application::query()->firstOrFail();
    expect(AiInterviewSession::query()->where('application_id', $application->id)->exists())->toBeTrue();

    Notification::assertSentTo($employee, AiInterviewInvitationNotification::class);
});

test('auto-invite: skipped when match score is below the configured threshold', function () {
    Notification::fake();

    $employee = makeReadyEmployee();
    $owner = User::factory()->employer()->create();
    $job = makePublishedJob($owner);
    // Threshold above any baseline score the matcher will produce for an empty profile.
    $job->forceFill([
        'auto_invite_ai_interview' => true,
        'ai_match_threshold' => 99,
    ])->save();

    $this->actingAs($employee)
        ->post(route('public.jobs.apply.store', ['job' => $job->slug]), [
            'cover_letter' => 'Halo.',
        ])
        ->assertRedirect();

    $application = Application::query()->firstOrFail();
    expect(AiInterviewSession::query()->where('application_id', $application->id)->exists())->toBeFalse();

    Notification::assertNotSentTo($employee, AiInterviewInvitationNotification::class);
});

test('auto-invite: opt-out flag prevents the session from being created', function () {
    Notification::fake();

    $employee = makeReadyEmployee();
    $owner = User::factory()->employer()->create();
    $job = makePublishedJob($owner);
    $job->forceFill([
        'auto_invite_ai_interview' => false,
        'ai_match_threshold' => 0,
    ])->save();

    $this->actingAs($employee)
        ->post(route('public.jobs.apply.store', ['job' => $job->slug]), [
            'cover_letter' => 'Halo.',
        ])
        ->assertRedirect();

    $application = Application::query()->firstOrFail();
    expect(AiInterviewSession::query()->where('application_id', $application->id)->exists())->toBeFalse();

    Notification::assertNotSentTo($employee, AiInterviewInvitationNotification::class);
});

test('employee cannot view another candidate application', function () {
    $alice = User::factory()->employee()->create();
    $bob = User::factory()->employee()->create();
    $aliceProfile = EmployeeProfile::factory()->create(['user_id' => $alice->id]);
    $job = makePublishedJob();
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $aliceProfile->id,
    ]);

    $this->actingAs($bob)
        ->get(route('employee.applications.show', ['application' => $application->id]))
        ->assertForbidden();
});
