<?php

use App\Enums\JobStatus;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
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

function makeJobFor(Company $company, User $owner, string $title, JobStatus $status = JobStatus::Published): Job
{
    $category = JobCategory::query()->first() ?? JobCategory::factory()->create();

    return Job::factory()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $category->id,
        'title' => $title,
        'status' => $status,
    ]);
}

/**
 * @param  array<string, mixed>  $payload
 * @return array<int, string>
 */
function searchTitles(array $payload): array
{
    return collect($payload['groups'] ?? [])
        ->flatMap(fn (array $group): array => $group['items'])
        ->pluck('title')
        ->all();
}

test('guests cannot search', function () {
    $this->getJson('/search?q=engineer')->assertUnauthorized();
});

test('employer only sees jobs from the company they own', function () {
    $mine = User::factory()->employer()->create();
    $myCompany = Company::factory()->approved()->create(['owner_id' => $mine->id]);
    makeJobFor($myCompany, $mine, 'Backend Engineer Kami');

    $other = User::factory()->employer()->create();
    $otherCompany = Company::factory()->approved()->create(['owner_id' => $other->id]);
    makeJobFor($otherCompany, $other, 'Backend Engineer Tetangga');

    $payload = $this->actingAs($mine)->getJson('/search?q=Backend Engineer')->assertOk()->json();

    expect(searchTitles($payload))
        ->toContain('Backend Engineer Kami')
        ->not->toContain('Backend Engineer Tetangga');
});

test('admin sees jobs from any company', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    makeJobFor($company, $owner, 'Backend Engineer Tetangga');

    $admin = User::factory()->admin()->create();

    $payload = $this->actingAs($admin)->getJson('/search?q=Backend Engineer')->assertOk()->json();

    expect(searchTitles($payload))->toContain('Backend Engineer Tetangga');
});

test('employee never sees unpublished jobs', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    makeJobFor($company, $owner, 'Rahasia Draft Engineer', JobStatus::Draft);
    makeJobFor($company, $owner, 'Publik Engineer');

    $employee = User::factory()->create();

    $payload = $this->actingAs($employee)->getJson('/search?q=Engineer')->assertOk()->json();

    expect(searchTitles($payload))
        ->toContain('Publik Engineer')
        ->not->toContain('Rahasia Draft Engineer');
});

test('query shorter than two characters returns nothing', function () {
    $admin = User::factory()->admin()->create();

    $payload = $this->actingAs($admin)->getJson('/search?q=a')->assertOk()->json();

    expect($payload['groups'])->toBe([]);
});

test('like wildcards typed by the user do not widen the match', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    makeJobFor($company, $owner, 'Backend Engineer');

    $admin = User::factory()->admin()->create();

    // Left unescaped, "%%" would match every row in every table.
    $payload = $this->actingAs($admin)->getJson('/search?q=%%')->assertOk()->json();

    expect(searchTitles($payload))->toBe([]);
});
