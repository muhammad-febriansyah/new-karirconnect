<?php

use App\Enums\CompanyStatus;
use App\Models\City;
use App\Models\Company;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class, ProvinceCitySeeder::class, LookupSeeder::class]);
});

function onbToken(User $user): array
{
    $token = test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()->json('data.tokens.access_token');

    return ['Authorization' => 'Bearer '.$token];
}

/**
 * A payload that satisfies OnboardingStoreRequest, which requires headline,
 * date_of_birth, gender, province_id, city_id and at least one skill.
 *
 * @return array<string, mixed>
 */
function onboardingBody(array $overrides = []): array
{
    $city = City::query()->first();

    return [
        'headline' => 'Flutter Engineer',
        'about' => 'Saya membangun aplikasi mobile.',
        'date_of_birth' => '1995-01-01',
        'gender' => 'male',
        'province_id' => $city->province_id,
        'city_id' => $city->id,
        'current_position' => 'Mobile Dev',
        'experience_level' => 'mid',
        'skills' => ['Flutter', 'Dart'],
        ...$overrides,
    ];
}

describe('employer onboarding', function (): void {
    it('lets a brand new employer complete onboarding and reach the gated api', function (): void {
        // Regression for a dead-end: every employer endpoint is behind
        // employer.onboarded, so without an onboarding endpoint outside that
        // gate a mobile employer could never get in.
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'HR Acme',
            'email' => 'hr@acme.test',
            'password' => 'Sup3rSecret!pass1',
            'password_confirmation' => 'Sup3rSecret!pass1',
            'role' => 'employer',
            'company_name' => 'Acme Indonesia',
        ])->assertCreated();

        $headers = ['Authorization' => 'Bearer '.$response->json('data.tokens.access_token')];

        // Locked out at first, and told exactly why.
        $this->withHeaders($headers)->getJson('/api/v1/employer/jobs')
            ->assertStatus(403)
            ->assertJsonPath('code', 'employer_onboarding_required');

        // Onboarding itself must be reachable in that state.
        $this->withHeaders($headers)->getJson('/api/v1/employer/onboarding')
            ->assertOk()
            ->assertJsonPath('meta.completed', false);

        $this->withHeaders($headers)->postJson('/api/v1/employer/onboarding/finish')->assertOk();

        // The onboarding gate is now satisfied, and the reason for being
        // blocked moves on to admin approval -- a state the owner can actually
        // do something about (and see via employer/company). The point is that
        // employer_onboarding_required is no longer a dead end.
        $this->withHeaders($headers)->getJson('/api/v1/employer/jobs')
            ->assertStatus(403)
            ->assertJsonPath('code', 'company_not_approved');

        // Once an admin approves, the API opens.
        Company::query()->where('name', 'Acme Indonesia')->update(['status' => CompanyStatus::Approved]);

        $this->withHeaders($headers)->getJson('/api/v1/employer/jobs')->assertOk();
    });

    it('updates the company profile during onboarding', function (): void {
        $user = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->create(['owner_id' => $user->id, 'onboarding_completed_at' => null]);

        $this->withHeaders(onbToken($user))
            ->postJson('/api/v1/employer/onboarding/profile', ['name' => 'Acme Nusantara'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Acme Nusantara');
    });

    it('grants the trial on finish', function (): void {
        $user = User::factory()->employer()->create(['password' => 'password']);
        $company = Company::factory()->create([
            'owner_id' => $user->id,
            'onboarding_completed_at' => null,
            'trial_redeemed_at' => null,
        ]);

        $this->withHeaders(onbToken($user))
            ->postJson('/api/v1/employer/onboarding/finish')
            ->assertOk()
            ->assertJsonPath('data.completed', true);

        expect($company->fresh()->onboarding_completed_at)->not->toBeNull();
    });

    it('is idempotent on finish', function (): void {
        $user = User::factory()->employer()->create(['password' => 'password']);
        $company = Company::factory()->create(['owner_id' => $user->id, 'onboarding_completed_at' => null]);
        $headers = onbToken($user);

        $this->withHeaders($headers)->postJson('/api/v1/employer/onboarding/finish')->assertOk();
        $first = $company->fresh()->onboarding_completed_at;

        $this->withHeaders($headers)->postJson('/api/v1/employer/onboarding/finish')->assertOk();

        // Finishing twice must not move the stamp or re-grant a trial.
        expect($company->fresh()->onboarding_completed_at->toIso8601String())->toBe($first->toIso8601String());
    });

    it('blocks a jobseeker from employer onboarding', function (): void {
        $seeker = User::factory()->employee()->create(['password' => 'password']);

        $this->withHeaders(onbToken($seeker))
            ->getJson('/api/v1/employer/onboarding')
            ->assertStatus(403);
    });
});

describe('employee onboarding', function (): void {
    it('returns the current onboarding state', function (): void {
        $user = User::factory()->employee()->create([
            'password' => 'password',
            'onboarding_completed_at' => null,
        ]);

        $this->withHeaders(onbToken($user))
            ->getJson('/api/v1/onboarding')
            ->assertOk()
            ->assertJsonPath('meta.completed', false)
            ->assertJsonStructure(['data' => ['headline'], 'meta' => ['missing_items']]);
    });

    it('completes onboarding with profile, skills and history', function (): void {
        $user = User::factory()->employee()->create([
            'password' => 'password',
            'onboarding_completed_at' => null,
        ]);

        $this->withHeaders(onbToken($user))
            ->postJson('/api/v1/onboarding', onboardingBody([
                'work_experiences' => [[
                    'company_name' => 'Acme',
                    'position' => 'Engineer',
                    'start_date' => '2021-01-01',
                    'is_current' => true,
                ]],
                'educations' => [[
                    'institution' => 'Universitas Indonesia',
                    'level' => 's1',
                    'start_year' => 2015,
                    'end_year' => 2019,
                ]],
            ]))
            ->assertOk()
            ->assertJsonPath('meta.completed', true);

        expect($user->fresh()->onboarding_completed_at)->not->toBeNull();

        $profile = $user->employeeProfile->fresh();
        expect($profile->headline)->toBe('Flutter Engineer')
            ->and($profile->workExperiences)->toHaveCount(1)
            ->and($profile->educations)->toHaveCount(1)
            ->and($profile->skills)->toHaveCount(2);
    });

    it('creates skills that did not exist yet', function (): void {
        $user = User::factory()->employee()->create([
            'password' => 'password',
            'onboarding_completed_at' => null,
        ]);

        $this->withHeaders(onbToken($user))
            ->postJson('/api/v1/onboarding', onboardingBody(['skills' => ['A Very Niche Framework']]))
            ->assertOk();

        $this->assertDatabaseHas('skills', ['slug' => 'a-very-niche-framework']);
    });

    it('recomputes completion so the candidate can apply', function (): void {
        $user = User::factory()->employee()->create([
            'password' => 'password',
            'onboarding_completed_at' => null,
        ]);

        $this->withHeaders(onbToken($user))
            ->postJson('/api/v1/onboarding', onboardingBody([
                'experience_level' => 'senior',
                'skills' => ['Flutter', 'Dart', 'PHP'],
                'work_experiences' => [[
                    'company_name' => 'Acme', 'position' => 'Eng',
                    'start_date' => '2020-01-01', 'is_current' => true,
                ]],
                'educations' => [[
                    'institution' => 'UI', 'level' => 's1', 'start_year' => 2015, 'end_year' => 2019,
                ]],
            ]))
            ->assertOk();

        // SubmitApplicationAction gates applying at 60%.
        expect($user->employeeProfile->fresh()->profile_completion)->toBeGreaterThanOrEqual(60);
    });

    it('blocks an employer from jobseeker onboarding', function (): void {
        $employer = User::factory()->employer()->create(['password' => 'password']);

        $this->withHeaders(onbToken($employer))
            ->getJson('/api/v1/onboarding')
            ->assertStatus(403);
    });
});
