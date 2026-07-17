<?php

use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class, ProvinceCitySeeder::class, LookupSeeder::class]);
});

function discToken(User $user): array
{
    $token = test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()->json('data.tokens.access_token');

    return ['Authorization' => 'Bearer '.$token];
}

function discJob(array $attributes = [], ?Company $company = null): Job
{
    $owner = User::factory()->employer()->create();
    $company ??= Company::factory()->approved()->create(['owner_id' => $owner->id]);

    return Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => JobCategory::query()->value('id'),
        ...$attributes,
    ]);
}

function discSeeker(): User
{
    $user = User::factory()->employee()->create(['password' => 'password']);
    EmployeeProfile::factory()->create(['user_id' => $user->id, 'profile_completion' => 80]);

    return $user;
}

describe('recommendations', function (): void {
    it('returns recommendations with a score and explanation', function (): void {
        discJob();
        $user = discSeeker();

        $this->withHeaders(discToken($user))
            ->getJson('/api/v1/recommendations')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['job' => ['id', 'title', 'salary_min'], 'score', 'explanation']],
                'meta' => ['profile_completion'],
            ]);
    });

    it('masks salary and employer in recommendations', function (): void {
        // Regression: the recommender returns full models and the web page
        // emitted them raw, publishing hidden salaries and the identity behind
        // an anonymous posting.
        $company = Company::factory()->approved()->create(['name' => 'Secret Corp']);
        discJob([
            'is_anonymous' => true,
            'is_salary_visible' => false,
            'salary_min' => 99_000_000,
        ], $company);

        $user = discSeeker();

        $response = $this->withHeaders(discToken($user))->getJson('/api/v1/recommendations')->assertOk();

        // The job has to actually be recommended, or "no leak" would be
        // vacuously true against an empty list.
        expect($response->json('data'))->not->toBeEmpty()
            ->and($response->json('data.0.job.company.name'))->toBe('Confidential')
            ->and($response->json('data.0.job.salary_min'))->toBeNull();

        $body = json_encode($response->json());

        expect($body)->not->toContain('Secret Corp')
            ->and($body)->not->toContain('99000000');
    });

    it('dismisses a recommendation', function (): void {
        $job = discJob();
        $user = discSeeker();

        $this->withHeaders(discToken($user))
            ->postJson('/api/v1/recommendations/'.$job->slug.'/dismiss')
            ->assertOk();

        $this->assertDatabaseHas('dismissed_job_recommendations', [
            'employee_profile_id' => $user->employeeProfile->id,
            'job_id' => $job->id,
        ]);
    });

    it('blocks an employer from jobseeker recommendations', function (): void {
        $employer = User::factory()->employer()->create(['password' => 'password']);

        $this->withHeaders(discToken($employer))
            ->getJson('/api/v1/recommendations')
            ->assertStatus(403);
    });
});

describe('search', function (): void {
    it('searches as an authenticated user', function (): void {
        discJob(['title' => 'Flutter Engineer']);
        $user = discSeeker();

        $this->withHeaders(discToken($user))
            ->getJson('/api/v1/search?q=Flutter')
            ->assertOk()
            ->assertJsonStructure(['groups']);
    });

    it('returns nothing for a too-short query', function (): void {
        $user = discSeeker();

        $this->withHeaders(discToken($user))
            ->getJson('/api/v1/search?q=a')
            ->assertOk()
            ->assertJsonPath('groups', []);
    });

    it('requires authentication', function (): void {
        $this->getJson('/api/v1/search?q=Flutter')->assertStatus(401);
    });
});

describe('dashboard', function (): void {
    it('returns the jobseeker dashboard', function (): void {
        $user = discSeeker();

        $this->withHeaders(discToken($user))
            ->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('meta.role', 'employee')
            ->assertJsonStructure(['data']);
    });

    it('returns the employer dashboard', function (): void {
        $employer = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->approved()->create([
            'owner_id' => $employer->id,
            'onboarding_completed_at' => now(),
        ]);

        $this->withHeaders(discToken($employer))
            ->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('meta.role', 'employer');
    });

    it('requires authentication', function (): void {
        $this->getJson('/api/v1/dashboard')->assertStatus(401);
    });
});
