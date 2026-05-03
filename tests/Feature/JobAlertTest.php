<?php

use App\Models\Company;
use App\Models\Job;
use App\Models\JobAlert;
use App\Models\JobCategory;
use App\Models\User;
use App\Notifications\JobAlertDigestNotification;
use App\Services\JobAlerts\JobAlertDispatcher;
use App\Services\JobAlerts\JobAlertMatcherService;
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

function makeAlertContext(): array
{
    $user = User::factory()->employee()->create();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();

    return compact('user', 'owner', 'company', 'cat');
}

function makeJob(array $overrides = []): Job
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();

    return Job::factory()->published()->create(array_merge([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'published_at' => now(),
    ], $overrides));
}

test('matcher returns jobs matching keyword', function () {
    ['user' => $user, 'company' => $company, 'cat' => $cat, 'owner' => $owner] = makeAlertContext();

    Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'title' => 'Senior Laravel Engineer',
        'published_at' => now(),
    ]);
    Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'title' => 'Frontend Developer',
        'published_at' => now(),
    ]);

    $alert = JobAlert::factory()->create(['user_id' => $user->id, 'keyword' => 'Laravel']);
    $matches = app(JobAlertMatcherService::class)->match($alert);

    expect($matches)->toHaveCount(1);
    expect($matches->first()->title)->toContain('Laravel');
});

test('matcher excludes jobs published before last_sent_at', function () {
    ['user' => $user, 'company' => $company, 'cat' => $cat, 'owner' => $owner] = makeAlertContext();

    Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'title' => 'Old Job',
        'published_at' => now()->subDays(2),
    ]);
    Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
        'title' => 'New Job',
        'published_at' => now(),
    ]);

    $alert = JobAlert::factory()->create([
        'user_id' => $user->id,
        'keyword' => 'Job',
        'last_sent_at' => now()->subDay(),
    ]);

    $matches = app(JobAlertMatcherService::class)->match($alert);
    expect($matches)->toHaveCount(1);
    expect($matches->first()->title)->toBe('New Job');
});

test('matcher filters by category and city', function () {
    $user = User::factory()->employee()->create();
    $cat1 = JobCategory::factory()->create();
    $cat2 = JobCategory::factory()->create();

    makeJob(['title' => 'Match', 'job_category_id' => $cat1->id]);
    makeJob(['title' => 'NoMatch', 'job_category_id' => $cat2->id]);

    $alert = JobAlert::factory()->create([
        'user_id' => $user->id,
        'job_category_id' => $cat1->id,
        'keyword' => null,
    ]);
    $matches = app(JobAlertMatcherService::class)->match($alert);

    expect($matches)->toHaveCount(1);
    expect($matches->first()->title)->toBe('Match');
});

test('isDue respects daily frequency', function () {
    $alert = JobAlert::factory()->create([
        'frequency' => 'daily',
        'last_sent_at' => now()->subHours(2),
    ]);
    expect($alert->isDue())->toBeFalse();

    $alert->update(['last_sent_at' => now()->subDays(2)]);
    expect($alert->fresh()->isDue())->toBeTrue();
});

test('isDue returns true when never sent', function () {
    $alert = JobAlert::factory()->create(['last_sent_at' => null]);
    expect($alert->isDue())->toBeTrue();
});

test('isDue returns false for inactive alert', function () {
    $alert = JobAlert::factory()->inactive()->create(['last_sent_at' => null]);
    expect($alert->isDue())->toBeFalse();
});

test('dispatcher sends notification and updates last_sent_at', function () {
    Notification::fake();
    ['user' => $user] = makeAlertContext();
    makeJob(['title' => 'Senior PHP Developer']);

    $alert = JobAlert::factory()->create([
        'user_id' => $user->id,
        'keyword' => 'PHP',
        'frequency' => 'instant',
    ]);

    $count = app(JobAlertDispatcher::class)->dispatchOne($alert);

    expect($count)->toBe(1);
    Notification::assertSentTo($user, JobAlertDigestNotification::class);
    expect($alert->fresh()->last_sent_at)->not->toBeNull();
    expect($alert->fresh()->total_matches_sent)->toBe(1);
});

test('dispatcher returns zero and skips notification when no matches', function () {
    Notification::fake();
    ['user' => $user] = makeAlertContext();

    $alert = JobAlert::factory()->create([
        'user_id' => $user->id,
        'keyword' => 'NonExistentKeyword',
    ]);

    $count = app(JobAlertDispatcher::class)->dispatchOne($alert);

    expect($count)->toBe(0);
    Notification::assertNothingSent();
    expect($alert->fresh()->last_sent_at)->toBeNull();
});

test('run skips alerts that are not due', function () {
    Notification::fake();
    ['user' => $user] = makeAlertContext();
    makeJob(['title' => 'PHP role']);

    JobAlert::factory()->create([
        'user_id' => $user->id,
        'keyword' => 'PHP',
        'frequency' => 'daily',
        'last_sent_at' => now()->subHour(),
    ]);

    $stats = app(JobAlertDispatcher::class)->run();
    expect($stats['processed'])->toBe(1);
    expect($stats['sent'])->toBe(0);
    Notification::assertNothingSent();
});

test('artisan command dispatches alerts', function () {
    Notification::fake();
    ['user' => $user] = makeAlertContext();
    makeJob(['title' => 'Backend Lead']);

    JobAlert::factory()->create([
        'user_id' => $user->id,
        'keyword' => 'Backend',
        'frequency' => 'instant',
    ]);

    $this->artisan('alerts:dispatch')->assertSuccessful();
    Notification::assertSentTo($user, JobAlertDigestNotification::class);
});

test('employee can create job alert', function () {
    $user = User::factory()->employee()->create();
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();

    $this->actingAs($user)
        ->post('/employee/job-alerts', [
            'name' => 'Backend Indonesia',
            'keyword' => 'Laravel',
            'job_category_id' => $cat->id,
            'salary_min' => 'Rp 8.000.000',
            'frequency' => 'daily',
            'is_active' => true,
        ])
        ->assertRedirect();

    expect(JobAlert::query()->where('user_id', $user->id)->count())->toBe(1);
    expect(JobAlert::query()->first()->salary_min)->toBe(8000000);
});

test('employee cannot mutate another user alert', function () {
    $owner = User::factory()->employee()->create();
    $alert = JobAlert::factory()->create(['user_id' => $owner->id]);

    $intruder = User::factory()->employee()->create();

    $this->actingAs($intruder)
        ->delete("/employee/job-alerts/{$alert->id}")
        ->assertForbidden();

    expect(JobAlert::query()->find($alert->id))->not->toBeNull();
});

test('preview endpoint returns matching jobs', function () {
    $user = User::factory()->employee()->create();
    makeJob(['title' => 'Data Engineer Senior']);
    $alert = JobAlert::factory()->create([
        'user_id' => $user->id,
        'keyword' => 'Data Engineer',
    ]);

    $this->actingAs($user)
        ->getJson("/employee/job-alerts/{$alert->id}/preview")
        ->assertOk()
        ->assertJson(['count' => 1]);
});

test('manual dispatch endpoint sends digest immediately', function () {
    Notification::fake();
    $user = User::factory()->employee()->create();
    makeJob(['title' => 'Mobile Engineer']);

    $alert = JobAlert::factory()->create([
        'user_id' => $user->id,
        'keyword' => 'Mobile',
        'frequency' => 'weekly',
    ]);

    $this->actingAs($user)
        ->post("/employee/job-alerts/{$alert->id}/dispatch")
        ->assertRedirect();

    Notification::assertSentTo($user, JobAlertDigestNotification::class);
});

test('alert index renders for employee', function () {
    $user = User::factory()->employee()->create();
    JobAlert::factory()->count(2)->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->get('/employee/job-alerts')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('employee/job-alerts/index')
            ->has('alerts.data', 2)
        );
});
