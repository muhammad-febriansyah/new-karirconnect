<?php

use App\Enums\CrawlRunTrigger;
use App\Enums\JobSourceStatus;
use App\Enums\JobSourceType;
use App\Jobs\RunCrawlJob;
use App\Models\City;
use App\Models\CrawlRun;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\JobSource;
use App\Models\Province;
use App\Models\ScrapedCompany;
use App\Models\ScrapedJobListing;
use App\Models\ScrapedJobOrigin;
use App\Models\User;
use App\Services\Crawler\CrawlerClient;
use App\Services\Crawler\CrawlOrchestrator;
use App\Services\Crawler\DnsResolver;
use App\Services\ExternalJobs\ExternalSourceCatalog;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Queue::fake();
    app()->instance(DnsResolver::class, new class extends DnsResolver
    {
        public function resolve(string $host): array
        {
            return str_starts_with($host, 'internal.') ? ['10.1.1.1'] : ['93.184.216.34'];
        }
    });
    $this->admin = User::factory()->admin()->create();
});

function scrape(array $payload)
{
    return test()->actingAs(test()->admin)->postJson(route('admin.scraper.scrape.start'), $payload);
}

it('creates and queues a catalog source on first use', function () {
    scrape(['catalog' => ['xendit', 'jobicy-apac']])->assertOk()->assertJsonCount(2, 'runs');

    $xendit = JobSource::query()->where('slug', 'katalog-xendit')->sole();
    $jobicy = JobSource::query()->where('slug', 'katalog-jobicy-apac')->sole();

    expect($xendit->type)->toBe(JobSourceType::Greenhouse)
        ->and($xendit->status)->toBe(JobSourceStatus::Active)
        ->and($xendit->config['location_keywords'])->toContain('Indonesia')
        ->and($jobicy->type)->toBe(JobSourceType::JobFeed)
        ->and($jobicy->config['rules']['apply_external_only'])->toBeTrue();
    Queue::assertPushed(RunCrawlJob::class, 2);
});

it('reuses the same catalog source next time', function () {
    scrape(['catalog' => ['xendit']]);
    CrawlRun::query()->update(['status' => 'succeeded']);
    scrape(['catalog' => ['xendit']]);

    expect(JobSource::query()->where('slug', 'katalog-xendit')->count())->toBe(1)
        ->and(CrawlRun::query()->count())->toBe(2);
});

it('detects what a pasted URL is', function (string $url, JobSourceType $type, array $config) {
    scrape(['urls' => [$url]])->assertOk()->assertJsonCount(1, 'runs');

    $source = JobSource::query()->where('slug', 'like', 'url-%')->sole();

    expect($source->type)->toBe($type);
    foreach ($config as $key => $value) {
        expect($source->config[$key])->toBe($value);
    }
})->with([
    'greenhouse board' => ['https://job-boards.greenhouse.io/contohtek', JobSourceType::Greenhouse, ['board_token' => 'contohtek']],
    'lever board' => ['https://jobs.lever.co/contohtek/abc-123', JobSourceType::Lever, ['company' => 'contohtek']],
    'sitemap' => ['https://careers.contohtek.co.id/sitemap.xml', JobSourceType::Sitemap, []],
    'career page' => ['https://careers.contohtek.co.id/lowongan', JobSourceType::GenericHtml, []],
]);

it('refuses sites that block bots, and unsafe URLs', function (string $url, string $reason) {
    scrape(['urls' => [$url]])
        ->assertOk()
        ->assertJsonCount(0, 'runs')
        ->assertJsonPath('skipped.0.reason', fn (string $message) => str_contains($message, $reason));

    expect(JobSource::query()->count())->toBe(0);
})->with([
    'glints' => ['https://glints.com/id/opportunities/jobs/123', 'CAPTCHA'],
    'jobstreet subdomain' => ['https://id.jobstreet.com/id/job/123', 'robots.txt'],
    'linkedin' => ['https://www.linkedin.com/jobs/view/1', 'LinkedIn'],
    'private address' => ['https://internal.contohtek.co.id/jobs', 'non-publik'],
]);

it('requires something to scrape', function () {
    scrape([])->assertUnprocessable()->assertJsonValidationErrors('catalog');
    scrape(['urls' => ['http://insecure.example.com']])->assertUnprocessable();
});

it('lists the catalog and URL-added sources for the dialog', function () {
    scrape(['urls' => ['https://careers.contohtek.co.id/lowongan']]);

    $this->actingAs($this->admin)
        ->get(route('admin.scraper.listings.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('scrapeSources.catalog.0.key', 'dealls')
            ->where('scrapeSources.catalog.0.default_selected', true)
            ->missing('scrapeSources.catalog.8')
            ->has('scrapeSources.saved', 1)
            ->where('scrapeSources.saved.0.name', 'careers.contohtek.co.id'));
});

it('keeps catalog settings when the source form is saved', function () {
    $source = app(ExternalSourceCatalog::class)->sourceForEntry('remotive');

    $this->actingAs($this->admin)->put(route('admin.scraper.sources.update', $source), [
        'name' => 'Remotive', 'slug' => $source->slug, 'type' => 'job_feed', 'base_url' => $source->base_url,
        'allowed_domains' => 'remotive.com', 'status' => 'active', 'permission_notes' => 'x', 'robots_checked' => true,
        'schedule_minutes' => 1440, 'rate_limit_per_minute' => 30, 'max_pages' => 20, 'expected_min_items' => 0, 'config' => [],
    ])->assertSessionHasNoErrors();

    expect($source->refresh()->config['feed'])->toBe('remotive')
        ->and($source->config['rules']['no_structured_data'])->toBeTrue();
});

describe('feed items', function () {
    it('gives every feed item its own company and logo', function () {
        $source = app(ExternalSourceCatalog::class)->sourceForEntry('remoteok');
        $run = app(CrawlOrchestrator::class)->queue($source, CrawlRunTrigger::Manual);
        $item = fn (string $id, string $company) => [
            'external_id' => $id, 'title' => "Engineer {$id}", 'apply_url' => "https://remoteok.com/remote-jobs/{$id}",
            'source_url' => "https://remoteok.com/remote-jobs/{$id}", 'company_name' => $company,
            'company_logo_url' => "https://cdn.example.com/{$id}.png", 'description' => '<p>Work</p>', 'workplace_type_raw' => 'remote',
            'location_text' => 'Remote, Indonesia',
        ];
        Process::fake(['*' => Process::result(output: json_encode([
            'contract_version' => 1, 'run_uuid' => $run->uuid, 'status' => 'succeeded', 'engine_used' => 'api',
            'engines_attempted' => [], 'company' => ['name' => null], 'errors' => [], 'stats' => [],
            'items' => [$item('1', 'Acme'), $item('2', 'Beta')],
        ]))]);

        app(CrawlOrchestrator::class)->execute($run);

        expect(ScrapedCompany::query()->pluck('logo_url', 'name')->all())
            ->toBe(['Acme' => 'https://cdn.example.com/1.png', 'Beta' => 'https://cdn.example.com/2.png']);
    });

    it('enforces the feed terms on the published job', function () {
        $source = app(ExternalSourceCatalog::class)->sourceForEntry('remotive');
        $company = ScrapedCompany::factory()->create(['recruitment_email' => 'hr@acme.test']);
        $listing = ScrapedJobListing::factory()->create([
            'job_source_id' => $source->id,
            'scraped_company_id' => $company->id,
            'job_category_id' => JobCategory::factory()->create()->id,
        ]);
        $this->actingAs($this->admin)->postJson(route('admin.scraper.listings.publish'), [
            'listing_ids' => [$listing->id], 'employment_type' => 'full_time', 'work_arrangement' => 'remote', 'experience_level' => 'mid',
        ]);
        $job = Job::query()->sole();

        // No relay even with an email: Remotive requires applying on its page.
        expect($job->relayEmail())->toBeNull();

        $response = $this->get(route('public.jobs.show', $job->slug));
        $response->assertInertia(fn (Assert $page) => $page
            ->where('job.external.relay_enabled', false)
            ->where('job.external.attribution.name', 'Remotive')
            ->where('job.external.attribution.url', $listing->apply_url));
        // Remotive forbids passing its jobs to Google Jobs.
        expect($response->getContent())->not->toContain('"@type":"JobPosting"');
    });

    it('does not show a source credit for scraped career sites', function () {
        $source = app(ExternalSourceCatalog::class)->sourceForEntry('dealls');
        // Older rows may still carry an attribution rule in their config.
        $source->update(['config' => [...$source->config, 'rules' => ['attribution' => ['name' => 'Dealls', 'url' => 'https://dealls.com']]]]);
        $listing = ScrapedJobListing::factory()->create([
            'job_source_id' => $source->id,
            'scraped_company_id' => ScrapedCompany::factory()->create()->id,
            'job_category_id' => JobCategory::factory()->create()->id,
        ]);
        $this->actingAs($this->admin)->postJson(route('admin.scraper.listings.publish'), [
            'listing_ids' => [$listing->id], 'employment_type' => 'full_time', 'work_arrangement' => 'onsite', 'experience_level' => 'mid',
        ]);
        $job = Job::query()->sole();

        $this->get(route('public.jobs.show', $job->slug))
            ->assertInertia(fn (Assert $page) => $page->where('job.external.attribution', null));
    });
});

it('applies catalog limits and tells the worker which pages it read recently', function () {
    $source = app(ExternalSourceCatalog::class)->sourceForEntry('dealls');

    expect($source->type)->toBe(JobSourceType::Sitemap)
        ->and($source->max_pages)->toBe(150)
        ->and($source->schedule_minutes)->toBe(120);

    $listing = ScrapedJobListing::factory()->create(['job_source_id' => $source->id]);
    ScrapedJobOrigin::factory()->create([
        'scraped_job_listing_id' => $listing->id, 'job_source_id' => $source->id,
        'source_url' => 'https://dealls.com/loker/a', 'last_seen_at' => now()->subDay(),
    ]);
    ScrapedJobOrigin::factory()->create([
        'scraped_job_listing_id' => ScrapedJobListing::factory()->create(['job_source_id' => $source->id])->id,
        'job_source_id' => $source->id, 'source_url' => 'https://dealls.com/loker/old', 'last_seen_at' => now()->subWeek(),
    ]);

    $request = app(CrawlerClient::class)->buildRequest($source, CrawlRun::factory()->create(['job_source_id' => $source->id]));

    expect($request['recently_seen'])->toBe(['https://dealls.com/loker/a'])
        ->and($request['limits']['max_pages'])->toBe(150);
});

it('files a job board listing under its own employer, not the board', function () {
    $source = app(ExternalSourceCatalog::class)->sourceForEntry('dealls');
    $run = app(CrawlOrchestrator::class)->queue($source, CrawlRunTrigger::Manual);
    Process::fake(['*' => Process::result(output: json_encode([
        'contract_version' => 1, 'run_uuid' => $run->uuid, 'status' => 'succeeded', 'engine_used' => 'http',
        'engines_attempted' => [], 'errors' => [], 'stats' => [],
        'company' => ['name' => 'Dealls (YC W22)', 'logo_url' => 'https://dealls.com/logo.png'],
        'items' => [[
            'external_id' => 'v1', 'title' => 'Head of Account Management', 'apply_url' => 'https://dealls.com/loker/head~vidio',
            'source_url' => 'https://dealls.com/loker/head~vidio', 'company_name' => 'Vidio',
            'company_logo_url' => 'https://cdn.example.com/vidio.png', 'description' => '<p>Lead</p>',
            'location_text' => 'Jakarta Selatan, Indonesia',
        ]],
    ]))]);

    app(CrawlOrchestrator::class)->execute($run);

    $company = ScrapedJobListing::query()->sole()->company;
    expect($company->name)->toBe('Vidio')
        ->and($company->logo_url)->toBe('https://cdn.example.com/vidio.png');
});

describe('Indonesia only', function () {
    function ingestItems(array $items): CrawlRun
    {
        $source = app(ExternalSourceCatalog::class)->sourceForEntry('dealls');
        $run = app(CrawlOrchestrator::class)->queue($source, CrawlRunTrigger::Manual);
        Process::fake(['*' => Process::result(output: json_encode([
            'contract_version' => 1, 'run_uuid' => $run->uuid, 'status' => 'succeeded', 'engine_used' => 'http',
            'engines_attempted' => [], 'errors' => [], 'stats' => [], 'company' => null,
            'items' => array_map(fn (array $item) => [
                'title' => 'Staff '.$item['external_id'], 'apply_url' => 'https://dealls.com/loker/'.$item['external_id'],
                'source_url' => 'https://dealls.com/loker/'.$item['external_id'], 'company_name' => 'PT Maju', ...$item,
            ], $items),
        ]))]);
        app(CrawlOrchestrator::class)->execute($run);

        return $run->refresh();
    }

    it('keeps postings in Indonesia and drops the rest', function () {
        $province = Province::factory()->create(['name' => 'Papua Barat Daya']);
        City::factory()->create(['name' => 'Kota Sorong', 'province_id' => $province->id]);

        $run = ingestItems([
            ['external_id' => 'a', 'location_text' => 'Sorong'],
            ['external_id' => 'b', 'location_text' => 'Remote, Indonesia'],
            ['external_id' => 'c', 'location_text' => 'Bandung, ID'],
            ['external_id' => 'd', 'location_text' => 'Berlin, Germany'],
            ['external_id' => 'e', 'location_text' => 'Remote, Worldwide'],
            ['external_id' => 'f', 'location_text' => 'Kuala Lumpur, Malaysia'],
        ]);

        expect(ScrapedJobListing::query()->pluck('external_id')->sort()->values()->all())->toBe(['a', 'b', 'c'])
            ->and($run->summary['filtered_outside_indonesia'])->toBe(3);
    });

    it('uses an application email from the posting when its domain accepts mail', function () {
        app()->instance(DnsResolver::class, new class extends DnsResolver
        {
            public function resolve(string $host): array
            {
                return ['93.184.216.34'];
            }

            public function acceptsMail(string $domain): bool
            {
                return $domain === 'ptmaju.co.id';
            }
        });

        ingestItems([['external_id' => 'a', 'location_text' => 'Jakarta, Indonesia', 'contact_email' => 'HRD@ptmaju.co.id']]);
        $company = ScrapedCompany::query()->where('name', 'PT Maju')->sole();

        expect($company->recruitment_email)->toBe('hrd@ptmaju.co.id')
            ->and($company->recruitment_email_source)->toBe('https://dealls.com/loker/a')
            ->and($company->recruitment_email_verified_at)->not->toBeNull()
            ->and(ScrapedJobListing::query()->sole()->contact_email)->toBe('HRD@ptmaju.co.id');
    });

    it('ignores emails on domains that cannot receive mail, and never replaces an admin email', function () {
        app()->instance(DnsResolver::class, new class extends DnsResolver
        {
            public function resolve(string $host): array
            {
                return ['93.184.216.34'];
            }

            public function acceptsMail(string $domain): bool
            {
                return false;
            }
        });

        ingestItems([['external_id' => 'a', 'location_text' => 'Jakarta, Indonesia', 'contact_email' => 'hr@tidak-ada.invalid']]);

        expect(ScrapedCompany::query()->where('name', 'PT Maju')->sole()->recruitment_email)->toBeNull();
    });
});
