<?php

use App\Enums\CircuitState;
use App\Enums\EmploymentType;
use App\Enums\JobSourceStatus;
use App\Models\CrawlError;
use App\Models\CrawlRun;
use App\Models\JobSource;
use App\Models\ScrapedCompany;
use App\Models\ScrapedJobListing;
use App\Models\ScrapedJobOrigin;
use App\Models\Skill;
use Database\Seeders\JobSourceSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Schema;

describe('schema alignment with the portal', function () {
    it('gives scraped listings every content column job_posts has', function () {
        $portalOnly = [
            'id', 'company_id', 'posted_by_user_id', 'slug', 'status', 'is_anonymous',
            'is_featured', 'featured_until', 'views_count', 'applications_count',
            'ai_match_threshold', 'auto_invite_ai_interview', 'closed_at',
            // Link back to the listing a job was published from.
            'scraped_job_listing_id', 'external_apply_url',
            'created_at', 'updated_at', 'deleted_at',
        ];

        $expected = array_diff(Schema::getColumnListing('job_posts'), $portalOnly);
        $missing = array_diff($expected, Schema::getColumnListing('scraped_job_listings'));

        expect($missing)->toBeEmpty();
    });

    it('gives scraped companies every profile column companies has', function () {
        $portalOnly = [
            'id', 'owner_id', 'slug', 'status', 'verification_status', 'approved_at',
            'verified_at', 'onboarding_completed_at', 'trial_redeemed_at',
            'created_at', 'updated_at', 'deleted_at',
        ];

        $expected = array_diff(Schema::getColumnListing('companies'), $portalOnly);
        $missing = array_diff($expected, Schema::getColumnListing('scraped_companies'));

        expect($missing)->toBeEmpty();
    });
});

describe('unique keys', function () {
    it('rejects a second listing with the same source and external id', function () {
        $listing = ScrapedJobListing::factory()->create();

        ScrapedJobListing::factory()->create([
            'job_source_id' => $listing->job_source_id,
            'external_id' => $listing->external_id,
        ]);
    })->throws(QueryException::class);

    it('lets two sources use the same external id', function () {
        $listing = ScrapedJobListing::factory()->create(['external_id' => '42']);
        $other = ScrapedJobListing::factory()->create(['external_id' => '42']);

        expect($other->job_source_id)->not->toBe($listing->job_source_id);
    });

    it('rejects a duplicate origin for the same source and external id', function () {
        $origin = ScrapedJobOrigin::factory()->create();

        ScrapedJobOrigin::factory()->create([
            'scraped_job_listing_id' => $origin->scraped_job_listing_id,
            'job_source_id' => $origin->job_source_id,
            'external_id' => $origin->external_id,
        ]);
    })->throws(QueryException::class);

    it('rejects a duplicate scraped company with the same normalized name and domain', function () {
        $company = ScrapedCompany::factory()->create();

        ScrapedCompany::factory()->create([
            'normalized_name' => $company->normalized_name,
            'domain' => $company->domain,
        ]);
    })->throws(QueryException::class);

    it('makes updateOrCreate on the listing key idempotent', function () {
        $source = JobSource::factory()->create();
        $company = ScrapedCompany::factory()->create();

        $attributes = ScrapedJobListing::factory()->make([
            'job_source_id' => $source->id,
            'scraped_company_id' => $company->id,
        ])->getAttributes();

        foreach (range(1, 2) as $attempt) {
            ScrapedJobListing::query()->updateOrCreate(
                ['job_source_id' => $source->id, 'external_id' => $attributes['external_id']],
                $attributes,
            );
        }

        expect(ScrapedJobListing::query()->where('job_source_id', $source->id)->count())->toBe(1);
    });
});

describe('content hash', function () {
    it('ignores whitespace, case and markup but not real changes', function () {
        $base = [
            'title' => 'Backend Engineer',
            'company' => 'Acme',
            'location_text' => 'Jakarta',
            'employment_type' => EmploymentType::FullTime,
            'description' => '<p>Build APIs</p>',
        ];

        $same = ScrapedJobListing::computeContentHash([
            ...$base,
            'title' => '  backend   ENGINEER ',
            'employment_type' => 'full_time',
            'description' => 'Build   APIs',
        ]);
        $changed = ScrapedJobListing::computeContentHash([...$base, 'title' => 'Frontend Engineer']);

        expect(ScrapedJobListing::computeContentHash($base))
            ->toBe($same)
            ->toHaveLength(64)
            ->not->toBe($changed);
    });
});

describe('company name normalization', function () {
    it('drops legal suffixes and punctuation', function (string $input, string $expected) {
        expect(ScrapedCompany::normalizeName($input))->toBe($expected);
    })->with([
        ['PT. Acme Indonesia Tbk', 'acme indonesia'],
        ['Acme Indonesia', 'acme indonesia'],
        ['Gojek, Inc.', 'gojek'],
    ]);

    it('prefers the stored logo over the remote url', function () {
        $company = ScrapedCompany::factory()->make(['logo_url' => 'https://acme.test/logo.png']);

        expect($company->logoUrl())->toBe('https://acme.test/logo.png');

        $company->logo_path = 'scraped-companies/logos/acme.png';

        expect($company->logoUrl())->toEndWith('/storage/scraped-companies/logos/acme.png');
    });
});

describe('job source scheduling state', function () {
    it('only treats active sources as runnable', function () {
        expect(JobSource::factory()->create()->isRunnable())->toBeTrue()
            ->and(JobSource::factory()->disabled()->create()->isRunnable())->toBeFalse()
            ->and(JobSource::factory()->pendingPermission()->create()->isRunnable())->toBeFalse();
    });

    it('is due when it never ran or its interval has passed', function () {
        $never = JobSource::factory()->create(['last_run_at' => null]);
        $recent = JobSource::factory()->create(['schedule_minutes' => 60, 'last_run_at' => now()->subMinutes(10)]);
        $old = JobSource::factory()->create(['schedule_minutes' => 60, 'last_run_at' => now()->subMinutes(61)]);

        expect($never->isDue())->toBeTrue()
            ->and($recent->isDue())->toBeFalse()
            ->and($old->isDue())->toBeTrue();
    });

    it('is not due while cooling down or with an open circuit', function () {
        $cooling = JobSource::factory()->create(['cooldown_until' => now()->addMinutes(5)]);
        $open = JobSource::factory()->circuitOpen()->create();

        expect($cooling->isDue())->toBeFalse()
            ->and($open->isDue())->toBeFalse();
    });

    it('scopes eligible sources to active ones outside cooldown and open circuits', function () {
        $eligible = JobSource::factory()->create();
        $openExpired = JobSource::factory()->create([
            'circuit_state' => CircuitState::Open,
            'circuit_open_until' => now()->subMinute(),
        ]);
        JobSource::factory()->disabled()->create();
        JobSource::factory()->pendingPermission()->create();
        JobSource::factory()->circuitOpen()->create();
        JobSource::factory()->create(['cooldown_until' => now()->addHour()]);

        expect(JobSource::query()->eligible()->pluck('id')->sort()->values()->all())
            ->toBe([$eligible->id, $openExpired->id]);
    });
});

describe('relations', function () {
    it('links runs, errors, listings, origins and skills', function () {
        $source = JobSource::factory()->create();
        $run = CrawlRun::factory()->succeeded()->create(['job_source_id' => $source->id]);
        CrawlError::factory()->create(['crawl_run_id' => $run->id]);
        $listing = ScrapedJobListing::factory()->create(['job_source_id' => $source->id]);
        ScrapedJobOrigin::factory()->create([
            'scraped_job_listing_id' => $listing->id,
            'last_crawl_run_id' => $run->id,
        ]);
        $listing->skills()->attach(Skill::factory()->create(), ['is_required' => true]);

        expect($source->crawlRuns)->toHaveCount(1)
            ->and($source->latestCrawlRun->is($run))->toBeTrue()
            ->and($run->errors)->toHaveCount(1)
            ->and($run->errors->first()->job_source_id)->toBe($source->id)
            ->and($listing->origins->first()->job_source_id)->toBe($source->id)
            ->and($listing->skills->first()->pivot->is_required)->toBeTruthy()
            ->and($listing->company)->toBeInstanceOf(ScrapedCompany::class);
    });
});

describe('JobSourceSeeder', function () {
    it('seeds templates and platforms that cannot run, and is idempotent', function () {
        $this->seed(JobSourceSeeder::class);
        $this->seed(JobSourceSeeder::class);

        expect(JobSource::query()->count())->toBe(6)
            ->and(JobSource::query()->eligible()->count())->toBe(0)
            ->and(JobSource::query()->where('slug', 'linkedin')->value('status'))
            ->toBe(JobSourceStatus::PendingPermission);
    });
});
