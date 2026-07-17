<?php

use App\Enums\ApplicationStatus;
use App\Enums\CompanyStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Application;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class, ProvinceCitySeeder::class, LookupSeeder::class]);
    Notification::fake();
});

function employerToken(User $user): array
{
    $token = test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()->json('data.tokens.access_token');

    return ['Authorization' => 'Bearer '.$token];
}

/**
 * An onboarded, approved employer with an active subscription and quota.
 *
 * @return array{0: User, 1: Company}
 */
function readyEmployer(int $quota = 10): array
{
    $user = User::factory()->employer()->create(['password' => 'password']);
    $company = Company::factory()->approved()->create([
        'owner_id' => $user->id,
        'onboarding_completed_at' => now(),
    ]);

    $plan = SubscriptionPlan::factory()->create(['job_post_quota' => $quota]);

    CompanySubscription::factory()->create([
        'company_id' => $company->id,
        'plan_id' => $plan->id,
        'status' => SubscriptionStatus::Active,
        'starts_at' => now()->subDay(),
        'ends_at' => now()->addMonth(),
        'jobs_posted_count' => 0,
    ]);

    return [$user, $company];
}

/**
 * @return array<string, mixed>
 */
function jobBody(array $overrides = []): array
{
    return [
        'job_category_id' => JobCategory::query()->value('id'),
        'title' => 'Backend Engineer',
        'employment_type' => 'full_time',
        'work_arrangement' => 'remote',
        'experience_level' => 'mid',
        'is_salary_visible' => true,
        'status' => 'draft',
        'is_anonymous' => false,
        'auto_invite_ai_interview' => false,
        ...$overrides,
    ];
}

describe('employer company', function (): void {
    it('shows the owner their own company including moderation state', function (): void {
        [$user] = readyEmployer();

        $this->withHeaders(employerToken($user))
            ->getJson('/api/v1/employer/company')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['name', 'slug'],
                'meta' => ['status', 'verification_status', 'has_recruiter_access', 'subscription'],
            ]);
    });

    it('lets a pending company still read its own profile', function (): void {
        // This is exactly when an owner needs the page, so it must not be
        // behind the recruiter-active gate the public endpoint uses.
        $user = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->create([
            'owner_id' => $user->id,
            'status' => CompanyStatus::Pending,
            'onboarding_completed_at' => now(),
        ]);

        $this->withHeaders(employerToken($user))
            ->getJson('/api/v1/employer/company')
            ->assertOk()
            ->assertJsonPath('meta.status', 'pending')
            ->assertJsonPath('meta.has_recruiter_access', false);
    });

    it('updates the company profile', function (): void {
        [$user] = readyEmployer();

        $this->withHeaders(employerToken($user))
            ->postJson('/api/v1/employer/company', ['name' => 'Acme Nusantara'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Acme Nusantara');
    });

    it('blocks a jobseeker from the employer area', function (): void {
        $seeker = User::factory()->employee()->create(['password' => 'password']);

        $this->withHeaders(employerToken($seeker))
            ->getJson('/api/v1/employer/company')
            ->assertStatus(403);
    });

    it('answers a not-approved company with json, not a redirect', function (): void {
        // The web middleware redirects to an HTML verification page; a mobile
        // client can only act on a status code plus a code.
        $user = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->create([
            'owner_id' => $user->id,
            'status' => CompanyStatus::Pending,
            'onboarding_completed_at' => now(),
        ]);

        $this->withHeaders(employerToken($user))
            ->getJson('/api/v1/employer/jobs')
            ->assertStatus(403)
            ->assertJsonPath('code', 'company_not_approved');
    });

    it('answers an un-onboarded employer with json', function (): void {
        $user = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->approved()->create([
            'owner_id' => $user->id,
            'onboarding_completed_at' => null,
        ]);

        $this->withHeaders(employerToken($user))
            ->getJson('/api/v1/employer/jobs')
            ->assertStatus(403)
            ->assertJsonPath('code', 'employer_onboarding_required');
    });
});

describe('employer jobs', function (): void {
    it('creates a job as a draft', function (): void {
        [$user] = readyEmployer();

        $this->withHeaders(employerToken($user))
            ->postJson('/api/v1/employer/jobs', jobBody())
            ->assertCreated()
            ->assertJsonPath('data.title', 'Backend Engineer');

        $this->assertDatabaseHas('job_posts', ['title' => 'Backend Engineer', 'status' => 'draft']);
    });

    it('generates a slug from the title', function (): void {
        [$user] = readyEmployer();

        $response = $this->withHeaders(employerToken($user))
            ->postJson('/api/v1/employer/jobs', jobBody(['title' => 'Senior Flutter Dev']))
            ->assertCreated();

        expect($response->json('data.slug'))->toBe('senior-flutter-dev');
    });

    it('publishes on request', function (): void {
        [$user] = readyEmployer();

        $this->withHeaders(employerToken($user))
            ->postJson('/api/v1/employer/jobs', jobBody(['status' => 'published']))
            ->assertCreated()
            ->assertJsonPath('data.published_at', fn ($value) => $value !== null);

        $this->assertDatabaseHas('job_posts', ['title' => 'Backend Engineer', 'status' => 'published']);
    });

    it('refuses to let an employer feature their own job for free', function (): void {
        // Regression: is_featured was a client-supplied boolean on
        // StoreJobRequest, so an employer could take paid featured placement
        // for nothing. It is granted only by BillingService::applyJobBoost.
        [$user] = readyEmployer();

        $this->withHeaders(employerToken($user))
            ->postJson('/api/v1/employer/jobs', jobBody(['is_featured' => true]))
            ->assertCreated();

        $job = Job::query()->where('title', 'Backend Engineer')->sole();

        expect($job->is_featured)->toBeFalse()
            ->and($job->featured_until)->toBeNull();
    });

    it('consumes quota and refuses once it runs out', function (): void {
        [$user] = readyEmployer(quota: 1);
        $headers = employerToken($user);

        $this->withHeaders($headers)->postJson('/api/v1/employer/jobs', jobBody())->assertCreated();

        $this->withHeaders($headers)
            ->postJson('/api/v1/employer/jobs', jobBody(['title' => 'Second Role']))
            ->assertStatus(403)
            ->assertJsonPath('code', 'job_quota_exceeded');
    });

    it('refuses to post without an active subscription', function (): void {
        $user = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->approved()->create([
            'owner_id' => $user->id,
            'onboarding_completed_at' => now(),
        ]);

        $this->withHeaders(employerToken($user))
            ->postJson('/api/v1/employer/jobs', jobBody())
            ->assertStatus(403)
            ->assertJsonPath('code', 'subscription_required');
    });

    it('lists only this company jobs', function (): void {
        [$mine, $myCompany] = readyEmployer();
        [$theirs, $theirCompany] = readyEmployer();

        Job::factory()->published()->create([
            'company_id' => $myCompany->id,
            'posted_by_user_id' => $mine->id,
            'job_category_id' => JobCategory::query()->value('id'),
            'title' => 'Mine',
        ]);
        Job::factory()->published()->create([
            'company_id' => $theirCompany->id,
            'posted_by_user_id' => $theirs->id,
            'job_category_id' => JobCategory::query()->value('id'),
            'title' => 'Theirs',
        ]);

        $response = $this->withHeaders(employerToken($mine))->getJson('/api/v1/employer/jobs')->assertOk();

        expect($response->json('data'))->toHaveCount(1)
            ->and($response->json('data.0.title'))->toBe('Mine');
    });

    it('refuses to touch another company job', function (): void {
        [$mine] = readyEmployer();
        [$theirs, $theirCompany] = readyEmployer();

        $job = Job::factory()->published()->create([
            'company_id' => $theirCompany->id,
            'posted_by_user_id' => $theirs->id,
            'job_category_id' => JobCategory::query()->value('id'),
        ]);

        $this->withHeaders(employerToken($mine))
            ->postJson('/api/v1/employer/jobs/'.$job->slug.'/close')
            ->assertStatus(403);

        expect($job->fresh()->status->value)->toBe('published');
    });

    it('closes a job', function (): void {
        [$user, $company] = readyEmployer();

        $job = Job::factory()->published()->create([
            'company_id' => $company->id,
            'posted_by_user_id' => $user->id,
            'job_category_id' => JobCategory::query()->value('id'),
        ]);

        $this->withHeaders(employerToken($user))
            ->postJson('/api/v1/employer/jobs/'.$job->slug.'/close')
            ->assertOk();

        expect($job->fresh()->status->value)->toBe('closed');
    });
});

describe('employer applicants', function (): void {
    it('lists applicants for this company only', function (): void {
        [$user, $company] = readyEmployer();

        $job = Job::factory()->published()->create([
            'company_id' => $company->id,
            'posted_by_user_id' => $user->id,
            'job_category_id' => JobCategory::query()->value('id'),
        ]);

        $seeker = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $seeker->id]);
        Application::factory()->create(['job_id' => $job->id, 'employee_profile_id' => $profile->id]);

        $response = $this->withHeaders(employerToken($user))
            ->getJson('/api/v1/employer/applicants')->assertOk();

        expect($response->json('data'))->toHaveCount(1)
            ->and($response->json('data.0.candidate.name'))->toBe($seeker->name);
    });

    it('changes an applicant status and logs it', function (): void {
        [$user, $company] = readyEmployer();

        $job = Job::factory()->published()->create([
            'company_id' => $company->id,
            'posted_by_user_id' => $user->id,
            'job_category_id' => JobCategory::query()->value('id'),
        ]);

        $seeker = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $seeker->id]);
        $application = Application::factory()->create([
            'job_id' => $job->id,
            'employee_profile_id' => $profile->id,
            'status' => ApplicationStatus::Submitted,
        ]);

        $this->withHeaders(employerToken($user))
            ->postJson('/api/v1/employer/applicants/'.$application->id.'/status', [
                'status' => 'shortlisted',
                'note' => 'Profil cocok.',
            ])
            ->assertOk();

        expect($application->fresh()->status)->toBe(ApplicationStatus::Shortlisted);

        $this->assertDatabaseHas('application_status_logs', [
            'application_id' => $application->id,
            'to_status' => 'shortlisted',
        ]);
    });

    it('refuses to change status on another company applicant', function (): void {
        [$mine] = readyEmployer();
        [$theirs, $theirCompany] = readyEmployer();

        $job = Job::factory()->published()->create([
            'company_id' => $theirCompany->id,
            'posted_by_user_id' => $theirs->id,
            'job_category_id' => JobCategory::query()->value('id'),
        ]);

        $seeker = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $seeker->id]);
        $application = Application::factory()->create([
            'job_id' => $job->id,
            'employee_profile_id' => $profile->id,
            'status' => ApplicationStatus::Submitted,
        ]);

        $this->withHeaders(employerToken($mine))
            ->postJson('/api/v1/employer/applicants/'.$application->id.'/status', ['status' => 'rejected'])
            ->assertStatus(403);

        expect($application->fresh()->status)->toBe(ApplicationStatus::Submitted);
    });
});
