<?php

use App\Filters\Jobs\JobBrowseFilter;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class, ProvinceCitySeeder::class, LookupSeeder::class]);
});

function publishedJobTitled(string $title): Job
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    return Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => JobCategory::query()->value('id'),
        'title' => $title,
    ]);
}

/**
 * @return array<int, string>
 */
function titlesMatching(string $search): array
{
    return app(JobBrowseFilter::class)
        ->apply(['search' => $search])
        ->pluck('title')
        ->all();
}

it('treats a percent sign as text rather than a wildcard', function (): void {
    // Regression: the term was interpolated straight into "%{$term}%", so a
    // user's own "%" reached the engine as an operator. Searching "%" matched
    // every job on the board, and "%%%%%" forced a leading-wildcard scan across
    // every title plus a correlated subquery on company names -- free database
    // load for anyone hitting the public /jobs page.
    publishedJobTitled('Backend Engineer');
    publishedJobTitled('Growth Analyst 100% Remote');

    expect(titlesMatching('100%'))->toBe(['Growth Analyst 100% Remote']);
});

it('does not let a bare wildcard match every job', function (): void {
    // A lone "%" used to match the entire board. Escaped, it is just a
    // character: it finds the row that literally contains one, and nothing
    // else.
    publishedJobTitled('Backend Engineer');
    publishedJobTitled('Data Analyst');
    publishedJobTitled('Growth Analyst 100% Remote');

    expect(titlesMatching('%'))->toBe(['Growth Analyst 100% Remote']);
});

it('treats an underscore as text rather than a single-character wildcard', function (): void {
    // "_" matches any one character in LIKE, so "a_b" would match "axb".
    publishedJobTitled('Senior QA');
    publishedJobTitled('Role_Alpha Engineer');

    expect(titlesMatching('Role_Alpha'))->toBe(['Role_Alpha Engineer']);
});

it('still finds ordinary partial matches', function (): void {
    // The escaping must not break the normal case it exists to serve.
    publishedJobTitled('Backend Engineer');
    publishedJobTitled('Data Analyst');

    expect(titlesMatching('Engineer'))->toBe(['Backend Engineer']);
});
