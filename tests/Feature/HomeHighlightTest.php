<?php

use App\Models\Company;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
use App\Services\Public\HomeService;
use Carbon\CarbonInterface;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Cache;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class, ProvinceCitySeeder::class, LookupSeeder::class]);
    Cache::flush();
});

/**
 * A single published job closing on the given date.
 */
function jobClosingOn(?CarbonInterface $deadline): Job
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    return Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => JobCategory::query()->value('id'),
        'application_deadline' => $deadline,
        // Above the few_applicants threshold, so 'urgent' is the only badge
        // that can legitimately win and the assertion stays unambiguous.
        'applications_count' => 40,
    ]);
}

function highlightOfFirstJob(): ?string
{
    return app(HomeService::class)->snapshot()['featured_jobs'][0]['highlight'] ?? null;
}

it('marks a job closing today as urgent', function (): void {
    // Regression: application_deadline is cast to 'date', so it hydrates at
    // 00:00. Compared against a bare now(), a job closing today was already in
    // the past by 00:00:01 and lost the badge -- the single most urgent job on
    // the board was the one that never got flagged.
    jobClosingOn(now());

    expect(highlightOfFirstJob())->toBe('urgent');
});

it('marks a job closing in seven days as urgent', function (): void {
    // The far edge: a deadline exactly seven days out must stay inside the
    // window rather than falling off it.
    jobClosingOn(now()->addDays(7));

    expect(highlightOfFirstJob())->toBe('urgent');
});

it('does not mark a job closing well beyond the window as urgent', function (): void {
    jobClosingOn(now()->addDays(30));

    expect(highlightOfFirstJob())->not->toBe('urgent');
});

it('does not mark a job whose deadline has passed as urgent', function (): void {
    jobClosingOn(now()->subDay());

    expect(highlightOfFirstJob())->not->toBe('urgent');
});
