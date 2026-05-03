<?php

use App\Models\AiMatchScore;
use App\Models\Application;
use App\Models\City;
use App\Models\Company;
use App\Models\DismissedJobRecommendation;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\Skill;
use App\Models\User;
use App\Services\Recommendations\JobRecommendationService;
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

function makeProfileWithSkills(array $skillNames = ['Laravel', 'React']): array
{
    $user = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $user->id]);
    $skills = collect($skillNames)->map(fn (string $name) => Skill::query()->firstOrCreate(
        ['slug' => str()->slug($name)],
        ['name' => $name, 'category' => 'Programming', 'is_active' => true],
    ));
    $profile->skills()->sync($skills->pluck('id'));

    return ['user' => $user, 'profile' => $profile->fresh(), 'skills' => $skills];
}

test('recommendations exclude jobs the candidate already applied to', function () {
    ['user' => $user, 'profile' => $profile] = makeProfileWithSkills();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    $applied = Job::factory()->published()->create(['company_id' => $company->id, 'title' => 'Already Applied']);
    $available = Job::factory()->published()->create(['company_id' => $company->id, 'title' => 'Available Job']);

    Application::factory()->create([
        'job_id' => $applied->id,
        'employee_profile_id' => $profile->id,
    ]);

    $recs = app(JobRecommendationService::class)->recommend($profile, 5);
    $titles = $recs->pluck('job.title')->all();

    expect($titles)->toContain('Available Job')
        ->and($titles)->not->toContain('Already Applied');
});

test('dismissed jobs do not appear in recommendations', function () {
    ['user' => $user, 'profile' => $profile] = makeProfileWithSkills();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    $hidden = Job::factory()->published()->create(['company_id' => $company->id, 'title' => 'Hidden Job']);
    Job::factory()->published()->create(['company_id' => $company->id, 'title' => 'Visible Job']);

    DismissedJobRecommendation::query()->create([
        'employee_profile_id' => $profile->id,
        'job_id' => $hidden->id,
        'dismissed_at' => now(),
    ]);

    $titles = app(JobRecommendationService::class)->recommend($profile, 5)->pluck('job.title')->all();

    expect($titles)->toContain('Visible Job')
        ->and($titles)->not->toContain('Hidden Job');
});

test('skill overlap drives the score above the no-skill baseline', function () {
    ['profile' => $profile, 'skills' => $skills] = makeProfileWithSkills(['Laravel', 'React', 'PHP']);
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    $matchingJob = Job::factory()->published()->create(['company_id' => $company->id, 'title' => 'Matching Job']);
    $matchingJob->skills()->sync($skills->pluck('id'));

    $unrelatedSkill = Skill::query()->create(['name' => 'COBOL', 'slug' => 'cobol', 'category' => 'Programming', 'is_active' => true]);
    $offJob = Job::factory()->published()->create(['company_id' => $company->id, 'title' => 'Off Job']);
    $offJob->skills()->sync([$unrelatedSkill->id]);

    $recs = app(JobRecommendationService::class)->recommend($profile, 5);

    $matchRow = $recs->firstWhere('job.title', 'Matching Job');
    $offRow = $recs->firstWhere('job.title', 'Off Job');

    expect($matchRow['score'])->toBeGreaterThan($offRow['score']);
    expect($matchRow['breakdown']['skills'])->toBeGreaterThan(0);
    expect($offRow['breakdown']['skills'])->toBe(0);
});

test('city match boosts the score', function () {
    ['profile' => $profile] = makeProfileWithSkills();
    $cities = City::query()->limit(2)->pluck('id', 'province_id');
    [$provinceA, $cityA] = [array_keys($cities->all())[0], $cities->values()[0]];
    [$provinceB, $cityB] = [array_keys($cities->all())[1], $cities->values()[1]];

    $profile->update(['city_id' => $cityA, 'province_id' => $provinceA]);

    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    Job::factory()->published()->create(['company_id' => $company->id, 'title' => 'Local', 'city_id' => $cityA, 'province_id' => $provinceA]);
    Job::factory()->published()->create(['company_id' => $company->id, 'title' => 'Remote', 'city_id' => $cityB, 'province_id' => $provinceB]);

    $recs = app(JobRecommendationService::class)->recommend($profile->fresh(), 5);
    $local = $recs->firstWhere('job.title', 'Local');
    $remote = $recs->firstWhere('job.title', 'Remote');

    expect($local['breakdown']['city'])->toBeGreaterThan($remote['breakdown']['city']);
});

test('cached score is reused within ttl', function () {
    ['profile' => $profile] = makeProfileWithSkills();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $job = Job::factory()->published()->create(['company_id' => $company->id]);

    AiMatchScore::query()->create([
        'job_id' => $job->id,
        'candidate_profile_id' => $profile->id,
        'score' => 88,
        'breakdown' => ['skills' => 50, 'category' => 0, 'city' => 15, 'salary' => 10, 'recency' => 10],
        'explanation' => 'cached row',
        'computed_at' => now()->subDay(),
    ]);

    $recs = app(JobRecommendationService::class)->recommend($profile, 5);
    $row = $recs->firstWhere('job.id', $job->id);

    expect($row['score'])->toBe(88);
    expect($row['explanation'])->toBe('cached row');
});

test('stale cache is recomputed', function () {
    ['profile' => $profile] = makeProfileWithSkills();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $job = Job::factory()->published()->create(['company_id' => $company->id]);

    AiMatchScore::query()->create([
        'job_id' => $job->id,
        'candidate_profile_id' => $profile->id,
        'score' => 1,
        'breakdown' => ['skills' => 1],
        'explanation' => 'stale',
        'computed_at' => now()->subDays(30),
    ]);

    app(JobRecommendationService::class)->recommend($profile, 5);

    $row = AiMatchScore::query()->where('job_id', $job->id)
        ->where('candidate_profile_id', $profile->id)
        ->first();

    expect($row->explanation)->not->toBe('stale');
    expect($row->computed_at)->toBeGreaterThan(now()->subMinute());
});

test('employee can view recommendations page', function () {
    ['user' => $user] = makeProfileWithSkills();

    $this->actingAs($user)
        ->get('/employee/recommendations')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('employee/recommendations/index'));
});

test('non-employee cannot access recommendations', function () {
    $employer = User::factory()->employer()->create();
    $this->actingAs($employer)
        ->get('/employee/recommendations')
        ->assertForbidden();
});

test('employee can dismiss a recommendation', function () {
    ['user' => $user, 'profile' => $profile] = makeProfileWithSkills();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $job = Job::factory()->published()->create(['company_id' => $company->id]);

    $this->actingAs($user)
        ->post("/employee/recommendations/{$job->slug}/dismiss")
        ->assertRedirect();

    expect(DismissedJobRecommendation::query()->where('employee_profile_id', $profile->id)->where('job_id', $job->id)->exists())->toBeTrue();
});

test('dismissing twice is idempotent', function () {
    ['user' => $user, 'profile' => $profile] = makeProfileWithSkills();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $job = Job::factory()->published()->create(['company_id' => $company->id]);

    $this->actingAs($user)->post("/employee/recommendations/{$job->slug}/dismiss");
    $this->actingAs($user)->post("/employee/recommendations/{$job->slug}/dismiss");

    expect(DismissedJobRecommendation::query()
        ->where('employee_profile_id', $profile->id)
        ->where('job_id', $job->id)
        ->count())->toBe(1);
});
