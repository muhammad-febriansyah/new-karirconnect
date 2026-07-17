<?php

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\CandidateCv;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class, ProvinceCitySeeder::class, LookupSeeder::class]);
    Notification::fake();
});

function bearer(User $user): array
{
    $token = test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()->json('data.tokens.access_token');

    return ['Authorization' => 'Bearer '.$token];
}

/** A jobseeker complete enough to clear the 60% gate in SubmitApplicationAction. */
function applicant(): User
{
    $user = User::factory()->employee()->create(['password' => 'password']);
    EmployeeProfile::factory()->create(['user_id' => $user->id, 'profile_completion' => 80]);

    return $user;
}

function openJob(array $attributes = []): Job
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $category = JobCategory::query()->first() ?? JobCategory::factory()->create();

    return Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $category->id,
        ...$attributes,
    ]);
}

describe('applying', function (): void {
    it('submits an application', function (): void {
        $user = applicant();
        $job = openJob();

        $this->withHeaders(bearer($user))
            ->postJson('/api/v1/jobs/'.$job->slug.'/apply', [
                'cover_letter' => 'Saya tertarik dengan posisi ini.',
                'expected_salary' => 12_000_000,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'submitted');

        $this->assertDatabaseHas('applications', [
            'job_id' => $job->id,
            'employee_profile_id' => $user->employeeProfile->id,
            'status' => 'submitted',
        ]);
    });

    it('records a status log so the candidate sees history', function (): void {
        $user = applicant();
        $job = openJob();

        $this->withHeaders(bearer($user))
            ->postJson('/api/v1/jobs/'.$job->slug.'/apply', [])
            ->assertCreated();

        $this->assertDatabaseHas('application_status_logs', [
            'to_status' => 'submitted',
            'changed_by_user_id' => $user->id,
        ]);
    });

    it('refuses a second application to the same job', function (): void {
        $user = applicant();
        $job = openJob();

        $this->withHeaders(bearer($user))->postJson('/api/v1/jobs/'.$job->slug.'/apply', [])->assertCreated();

        $this->withHeaders(bearer($user))
            ->postJson('/api/v1/jobs/'.$job->slug.'/apply', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('job');
    });

    it('refuses to apply to an unpublished job', function (): void {
        $user = applicant();
        $job = openJob(['status' => 'draft', 'published_at' => null]);

        $this->withHeaders(bearer($user))
            ->postJson('/api/v1/jobs/'.$job->slug.'/apply', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('job');
    });

    it('refuses an incomplete profile', function (): void {
        $user = User::factory()->employee()->create(['password' => 'password']);
        EmployeeProfile::factory()->create(['user_id' => $user->id, 'profile_completion' => 20]);
        $job = openJob();

        $this->withHeaders(bearer($user))
            ->postJson('/api/v1/jobs/'.$job->slug.'/apply', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('profile');
    });

    it('blocks an employer from applying', function (): void {
        $employer = User::factory()->employer()->create(['password' => 'password']);
        $job = openJob();

        $this->withHeaders(bearer($employer))
            ->postJson('/api/v1/jobs/'.$job->slug.'/apply', [])
            ->assertStatus(403);
    });

    it('blocks a guest from applying', function (): void {
        $job = openJob();

        $this->postJson('/api/v1/jobs/'.$job->slug.'/apply', [])->assertStatus(401);
    });

    it('refuses a CV that belongs to another candidate', function (): void {
        // Regression: candidate_cv_id was validated with a bare exists rule, so
        // any id would pass and SubmitApplicationAction wrote it straight
        // through -- letting one candidate attach another's resume.
        $mine = applicant();
        $theirs = applicant();

        $victimCv = CandidateCv::factory()->create([
            'employee_profile_id' => $theirs->employeeProfile->id,
        ]);

        $job = openJob();

        $this->withHeaders(bearer($mine))
            ->postJson('/api/v1/jobs/'.$job->slug.'/apply', [
                'candidate_cv_id' => $victimCv->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('candidate_cv_id');

        $this->assertDatabaseMissing('applications', ['candidate_cv_id' => $victimCv->id]);
    });

    it('accepts the candidate own CV', function (): void {
        $user = applicant();
        $cv = CandidateCv::factory()->create(['employee_profile_id' => $user->employeeProfile->id]);
        $job = openJob();

        $this->withHeaders(bearer($user))
            ->postJson('/api/v1/jobs/'.$job->slug.'/apply', ['candidate_cv_id' => $cv->id])
            ->assertCreated();

        $this->assertDatabaseHas('applications', ['candidate_cv_id' => $cv->id]);
    });
});

describe('my applications', function (): void {
    it('lists only my own applications', function (): void {
        $mine = applicant();
        $theirs = applicant();

        Application::factory()->create(['employee_profile_id' => $mine->employeeProfile->id, 'job_id' => openJob()->id]);
        Application::factory()->create(['employee_profile_id' => $theirs->employeeProfile->id, 'job_id' => openJob()->id]);

        $response = $this->withHeaders(bearer($mine))->getJson('/api/v1/applications')->assertOk();

        expect($response->json('data'))->toHaveCount(1);
    });

    it('shows an application detail', function (): void {
        $user = applicant();
        $application = Application::factory()->create([
            'employee_profile_id' => $user->employeeProfile->id,
            'job_id' => openJob()->id,
        ]);

        $this->withHeaders(bearer($user))
            ->getJson('/api/v1/applications/'.$application->id)
            ->assertOk()
            ->assertJsonPath('data.id', $application->id)
            ->assertJsonStructure(['data' => ['status_logs', 'cover_letter']]);
    });

    it('refuses to show another candidate application', function (): void {
        $mine = applicant();
        $theirs = applicant();

        $application = Application::factory()->create([
            'employee_profile_id' => $theirs->employeeProfile->id,
            'job_id' => openJob()->id,
        ]);

        $this->withHeaders(bearer($mine))
            ->getJson('/api/v1/applications/'.$application->id)
            ->assertStatus(403);
    });

    it('filters by status', function (): void {
        $user = applicant();
        Application::factory()->create([
            'employee_profile_id' => $user->employeeProfile->id,
            'job_id' => openJob()->id,
            'status' => ApplicationStatus::Submitted,
        ]);
        Application::factory()->create([
            'employee_profile_id' => $user->employeeProfile->id,
            'job_id' => openJob()->id,
            'status' => ApplicationStatus::Rejected,
        ]);

        $response = $this->withHeaders(bearer($user))
            ->getJson('/api/v1/applications?status=rejected')->assertOk();

        expect($response->json('data'))->toHaveCount(1)
            ->and($response->json('data.0.status'))->toBe('rejected');
    });
});

describe('withdrawing', function (): void {
    it('withdraws an active application and logs it', function (): void {
        $user = applicant();
        $application = Application::factory()->create([
            'employee_profile_id' => $user->employeeProfile->id,
            'job_id' => openJob()->id,
            'status' => ApplicationStatus::Submitted,
        ]);

        $this->withHeaders(bearer($user))
            ->postJson('/api/v1/applications/'.$application->id.'/withdraw')
            ->assertOk()
            ->assertJsonPath('data.status', 'withdrawn');

        $this->assertDatabaseHas('application_status_logs', [
            'application_id' => $application->id,
            'from_status' => 'submitted',
            'to_status' => 'withdrawn',
        ]);
    });

    it('refuses to withdraw an application that already concluded', function (): void {
        $user = applicant();
        $application = Application::factory()->create([
            'employee_profile_id' => $user->employeeProfile->id,
            'job_id' => openJob()->id,
            'status' => ApplicationStatus::Hired,
        ]);

        $this->withHeaders(bearer($user))
            ->postJson('/api/v1/applications/'.$application->id.'/withdraw')
            ->assertStatus(422)
            ->assertJsonPath('code', 'application_not_withdrawable');

        expect($application->fresh()->status)->toBe(ApplicationStatus::Hired);
    });

    it('refuses to withdraw another candidate application', function (): void {
        $mine = applicant();
        $theirs = applicant();

        $application = Application::factory()->create([
            'employee_profile_id' => $theirs->employeeProfile->id,
            'job_id' => openJob()->id,
            'status' => ApplicationStatus::Submitted,
        ]);

        $this->withHeaders(bearer($mine))
            ->postJson('/api/v1/applications/'.$application->id.'/withdraw')
            ->assertStatus(403);

        expect($application->fresh()->status)->toBe(ApplicationStatus::Submitted);
    });
});

describe('saved jobs', function (): void {
    it('saves a job with a note', function (): void {
        $user = applicant();
        $job = openJob();

        $this->withHeaders(bearer($user))
            ->postJson('/api/v1/saved-jobs/'.$job->slug, ['note' => 'Lamar minggu depan'])
            ->assertCreated();

        $this->assertDatabaseHas('saved_jobs', [
            'user_id' => $user->id,
            'job_id' => $job->id,
            'note' => 'Lamar minggu depan',
        ]);
    });

    it('is idempotent when saving twice', function (): void {
        // A retry after a dropped response must not silently unsave.
        $user = applicant();
        $job = openJob();

        $this->withHeaders(bearer($user))->postJson('/api/v1/saved-jobs/'.$job->slug)->assertCreated();
        $this->withHeaders(bearer($user))->postJson('/api/v1/saved-jobs/'.$job->slug)->assertCreated();

        expect($user->savedJobs()->where('job_id', $job->id)->count())->toBe(1);
    });

    it('refuses to save an unpublished job', function (): void {
        $user = applicant();
        $job = openJob(['status' => 'draft', 'published_at' => null]);

        $this->withHeaders(bearer($user))
            ->postJson('/api/v1/saved-jobs/'.$job->slug)
            ->assertStatus(422);
    });

    it('lists saved jobs and masks salary', function (): void {
        $user = applicant();
        $job = openJob(['is_salary_visible' => false, 'salary_min' => 9_000_000]);

        $this->withHeaders(bearer($user))->postJson('/api/v1/saved-jobs/'.$job->slug)->assertCreated();

        $response = $this->withHeaders(bearer($user))->getJson('/api/v1/saved-jobs')->assertOk();

        expect($response->json('data'))->toHaveCount(1)
            ->and($response->json('data.0.salary_min'))->toBeNull();
    });

    it('unsaves a job', function (): void {
        $user = applicant();
        $job = openJob();

        $this->withHeaders(bearer($user))->postJson('/api/v1/saved-jobs/'.$job->slug)->assertCreated();
        $this->withHeaders(bearer($user))->deleteJson('/api/v1/saved-jobs/'.$job->slug)->assertOk();

        $this->assertDatabaseMissing('saved_jobs', ['user_id' => $user->id, 'job_id' => $job->id]);
    });

    it('does not leak another user saved jobs', function (): void {
        $mine = applicant();
        $theirs = applicant();
        $job = openJob();

        $this->withHeaders(bearer($theirs))->postJson('/api/v1/saved-jobs/'.$job->slug)->assertCreated();

        $response = $this->withHeaders(bearer($mine))->getJson('/api/v1/saved-jobs')->assertOk();

        expect($response->json('data'))->toHaveCount(0);
    });
});
