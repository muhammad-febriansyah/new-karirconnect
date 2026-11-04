<?php

use App\Enums\CrawlErrorCategory;
use App\Enums\CrawlRunStatus;
use App\Enums\JobSourceStatus;
use App\Enums\ScrapedJobListingStatus;
use App\Jobs\RunCrawlJob;
use App\Models\AuditLog;
use App\Models\CrawlError;
use App\Models\CrawlRun;
use App\Models\JobSource;
use App\Models\ScrapedJobListing;
use App\Models\ScrapedJobOrigin;
use App\Models\User;
use App\Services\Crawler\CrawlerClient;
use App\Services\Crawler\DnsResolver;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Queue::fake();

    app()->instance(DnsResolver::class, new class extends DnsResolver
    {
        public function resolve(string $host): array
        {
            return str_starts_with($host, 'internal.') ? ['10.0.0.9'] : ['93.184.216.34'];
        }
    });

    $this->admin = User::factory()->admin()->create();
    $this->source = JobSource::factory()->create(['name' => 'Contoh Greenhouse']);
});

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function sourcePayload(array $overrides = []): array
{
    return [
        'name' => 'Contoh Teknologi',
        'type' => 'greenhouse',
        'base_url' => 'https://boards-api.greenhouse.io/v1/boards/contohtek/jobs',
        'allowed_domains' => "boards-api.greenhouse.io\njob-boards.greenhouse.io",
        'config' => ['board_token' => 'contohtek', 'company_website' => ''],
        'status' => 'active',
        'permission_notes' => 'Greenhouse Job Board API publik.',
        'robots_checked' => true,
        'schedule_minutes' => 1440,
        'rate_limit_per_minute' => 30,
        'max_pages' => 20,
        'expected_min_items' => 0,
        'browser_allowed' => false,
        ...$overrides,
    ];
}

describe('access control', function () {
    it('blocks non-admins from every scraper page and action', function (string $method, Closure $url) {
        $employer = User::factory()->employer()->create();

        $this->actingAs($employer)->{$method}($url($this))->assertForbidden();
    })->with([
        'dashboard' => ['get', fn ($test) => route('admin.scraper.dashboard')],
        'sources' => ['get', fn ($test) => route('admin.scraper.sources.index')],
        'create source' => ['post', fn ($test) => route('admin.scraper.sources.store')],
        'edit source' => ['get', fn ($test) => route('admin.scraper.sources.edit', $test->source)],
        'delete source' => ['delete', fn ($test) => route('admin.scraper.sources.destroy', $test->source)],
        'run source' => ['post', fn ($test) => route('admin.scraper.sources.run', $test->source)],
        'listings' => ['get', fn ($test) => route('admin.scraper.listings.index')],
        'runs' => ['get', fn ($test) => route('admin.scraper.runs.index')],
        'logs' => ['get', fn ($test) => route('admin.scraper.logs.index')],
    ]);

    it('redirects guests to login', function () {
        $this->get(route('admin.scraper.dashboard'))->assertRedirect(route('login'));
    });
});

describe('pages', function () {
    it('renders the dashboard with deferred panels', function () {
        CrawlRun::factory()->succeeded()->create(['job_source_id' => $this->source->id]);

        $this->actingAs($this->admin)
            ->get(route('admin.scraper.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/scraper/dashboard')
                ->where('stats.sources_active', 1)
                ->has('recentRuns', 1)
                ->missing('activity')
                ->loadDeferredProps(fn (Assert $deferred) => $deferred
                    ->has('activity.days', 14)
                    ->has('attention')));
    });

    it('lists sources with their latest run', function () {
        CrawlRun::factory()->failed()->create(['job_source_id' => $this->source->id]);
        JobSource::factory()->pendingPermission()->create(['name' => 'LinkedIn']);

        $this->actingAs($this->admin)
            ->get(route('admin.scraper.sources.index', ['status' => 'active']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/scraper/sources/index')
                ->has('sources.data', 1)
                ->where('sources.data.0.name', 'Contoh Greenhouse')
                ->where('sources.data.0.latest_run.status', 'failed')
                ->where('filters.status', 'active'));
    });

    it('filters and shows scraped listings', function () {
        $listing = ScrapedJobListing::factory()->create(['job_source_id' => $this->source->id, 'title' => 'Backend Engineer']);
        ScrapedJobOrigin::factory()->create(['scraped_job_listing_id' => $listing->id]);
        ScrapedJobListing::factory()->create(['title' => 'Akuntan']);

        $this->actingAs($this->admin)
            ->get(route('admin.scraper.listings.index', ['search' => 'backend', 'source' => $this->source->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/scraper/listings/index')
                ->has('listings.data', 1)
                ->where('listings.data.0.title', 'Backend Engineer'));

        $this->actingAs($this->admin)
            ->get(route('admin.scraper.listings.show', $listing))
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/scraper/listings/show')
                ->where('listing.title', 'Backend Engineer')
                ->has('listing.origins', 1)
                ->where('listing.company.name', $listing->company->name));
    });

    it('treats LIKE wildcards in search as plain text', function () {
        ScrapedJobListing::factory()->create(['title' => 'Backend Engineer']);

        $this->actingAs($this->admin)
            ->get(route('admin.scraper.listings.index', ['search' => '%']))
            ->assertInertia(fn (Assert $page) => $page->has('listings.data', 0));
    });

    it('shows runs, a run with its errors, and the log', function () {
        $run = CrawlRun::factory()->failed()->create(['job_source_id' => $this->source->id]);
        CrawlError::factory()->create(['crawl_run_id' => $run->id, 'category' => CrawlErrorCategory::Captcha]);
        CrawlError::factory()->create([
            'crawl_run_id' => CrawlRun::factory()->failed()->create()->id,
            'category' => CrawlErrorCategory::Network,
        ]);

        $this->actingAs($this->admin)
            ->get(route('admin.scraper.runs.index', ['status' => 'failed', 'source' => $this->source->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/scraper/runs/index')
                ->has('runs.data', 1)
                ->where('runs.data.0.id', $run->id)
                ->where('hasActiveRuns', false));

        $this->actingAs($this->admin)
            ->get(route('admin.scraper.runs.show', $run))
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/scraper/runs/show')
                ->where('run.can_retry', true)
                ->where('run.can_cancel', false)
                ->has('runErrors.data', 1));

        $this->actingAs($this->admin)
            ->get(route('admin.scraper.logs.index', ['category' => 'captcha']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/scraper/logs/index')
                ->has('logs.data', 1)
                ->where('logs.data.0.category', 'captcha'));
    });
});

describe('managing sources', function () {
    it('creates an active source and records an audit log', function () {
        $this->actingAs($this->admin)
            ->post(route('admin.scraper.sources.store'), sourcePayload())
            ->assertRedirect(route('admin.scraper.sources.index'))
            ->assertSessionHas('inertia.flash_data.toast.type', 'success');

        $source = JobSource::query()->where('slug', 'contoh-teknologi')->sole();

        expect($source->status)->toBe(JobSourceStatus::Active)
            ->and($source->allowed_domains)->toBe(['boards-api.greenhouse.io', 'job-boards.greenhouse.io'])
            ->and($source->config)->toBe(['board_token' => 'contohtek'])
            ->and($source->robots_checked_at)->not->toBeNull()
            ->and(AuditLog::query()->where('action', 'job_source.create')->exists())->toBeTrue();
    });

    it('saves a source that is not yet allowed with a warning', function () {
        $this->actingAs($this->admin)
            ->post(route('admin.scraper.sources.store'), sourcePayload(['status' => 'pending_permission', 'permission_notes' => '', 'robots_checked' => false]))
            ->assertSessionHas('inertia.flash_data.toast.type', 'warning');
    });

    it('requires a permission note and a robots check before activating', function () {
        $this->actingAs($this->admin)
            ->post(route('admin.scraper.sources.store'), sourcePayload(['permission_notes' => '', 'robots_checked' => false]))
            ->assertSessionHasErrors(['permission_notes', 'robots_checked']);
    });

    it('rejects unsafe or inconsistent urls', function (array $overrides, string $field) {
        $this->actingAs($this->admin)
            ->post(route('admin.scraper.sources.store'), sourcePayload($overrides))
            ->assertSessionHasErrors($field);
    })->with([
        'plain http' => [['base_url' => 'http://boards-api.greenhouse.io/v1/boards/x/jobs'], 'base_url'],
        'host not allowlisted' => [['base_url' => 'https://evil.example.com/jobs'], 'base_url'],
        'private address' => [['base_url' => 'https://internal.greenhouse.io/jobs', 'allowed_domains' => 'internal.greenhouse.io'], 'base_url'],
        'bad domain' => [['allowed_domains' => 'https://boards-api.greenhouse.io/path'], 'allowed_domains.0'],
        'website outside allowlist' => [['config' => ['board_token' => 'contohtek', 'company_website' => 'https://www.contohtek.co.id/']], 'config.company_website'],
        'missing board token' => [['config' => []], 'config.board_token'],
    ]);

    it('refuses to activate platforms', function () {
        $this->actingAs($this->admin)
            ->post(route('admin.scraper.sources.store'), sourcePayload(['type' => 'platform', 'config' => []]))
            ->assertSessionHasErrors('status');
    });

    it('activates a sitemap source with a url pattern', function () {
        $this->actingAs($this->admin)
            ->post(route('admin.scraper.sources.store'), sourcePayload([
                'type' => 'sitemap',
                'base_url' => 'https://careers.contohtek.co.id/sitemap.xml',
                'allowed_domains' => 'careers.contohtek.co.id',
                'config' => ['url_pattern' => '/jobs/\\d+', 'company_name' => 'PT Contoh', 'selectors' => ['title' => 'h1.job-title', 'location' => '']],
            ]))
            ->assertSessionHasNoErrors();

        $source = JobSource::query()->where('type', 'sitemap')->sole();

        expect($source->config)->toEqual(['url_pattern' => '/jobs/\\d+', 'company_name' => 'PT Contoh', 'selectors' => ['title' => 'h1.job-title']]);
    });

    it('validates html source settings', function (array $overrides, string $field) {
        $this->actingAs($this->admin)
            ->post(route('admin.scraper.sources.store'), sourcePayload([
                'base_url' => 'https://careers.contohtek.co.id/karier',
                'allowed_domains' => 'careers.contohtek.co.id',
                ...$overrides,
            ]))
            ->assertSessionHasErrors($field);
    })->with([
        'sitemap without pattern' => [['type' => 'sitemap', 'config' => []], 'config.url_pattern'],
        'html without links or pattern' => [['type' => 'generic_html', 'config' => []], 'config.job_link_selector'],
        'broken regex' => [['type' => 'sitemap', 'config' => ['url_pattern' => '(']], 'config.url_pattern'],
        'unknown selector field' => [['type' => 'generic_html', 'config' => ['job_link_selector' => 'a', 'selectors' => ['script' => 'x']]], 'config.selectors'],
        'browser for an api source' => [['browser_allowed' => true], 'browser_allowed'],
        'robots override from a form' => [['type' => 'sitemap', 'config' => ['url_pattern' => '/jobs/', 'robots_override_permission' => true]], 'config'],
    ]);

    it('lets a career page source use the browser engine', function () {
        $this->actingAs($this->admin)
            ->post(route('admin.scraper.sources.store'), sourcePayload([
                'type' => 'generic_html',
                'base_url' => 'https://careers.contohtek.co.id/karier',
                'allowed_domains' => 'careers.contohtek.co.id',
                'config' => ['job_link_selector' => 'a.job-link'],
                'browser_allowed' => true,
            ]))
            ->assertSessionHasNoErrors();

        $source = JobSource::query()->where('type', 'generic_html')->sole();

        expect(app(CrawlerClient::class)->enginesFor($source))->toBe(['http', 'browser']);
    });

    it('makes slugs unique, including against deleted sources', function () {
        JobSource::factory()->create(['slug' => 'contoh-teknologi'])->delete();

        $this->actingAs($this->admin)->post(route('admin.scraper.sources.store'), sourcePayload());

        expect(JobSource::query()->where('name', 'Contoh Teknologi')->value('slug'))->toBe('contoh-teknologi-2');
    });

    it('updates a source', function () {
        $this->actingAs($this->admin)
            ->put(route('admin.scraper.sources.update', $this->source), sourcePayload(['name' => 'Nama Baru', 'slug' => $this->source->slug]))
            ->assertRedirect(route('admin.scraper.sources.index'));

        expect($this->source->refresh()->name)->toBe('Nama Baru')
            ->and(AuditLog::query()->where('action', 'job_source.update')->exists())->toBeTrue();
    });

    it('soft-deletes a source but keeps its listings', function () {
        $listing = ScrapedJobListing::factory()->create(['job_source_id' => $this->source->id]);

        $this->actingAs($this->admin)
            ->delete(route('admin.scraper.sources.destroy', $this->source))
            ->assertSessionHas('inertia.flash_data.toast.type', 'success');

        expect($this->source->refresh()->trashed())->toBeTrue()
            ->and($listing->fresh())->not->toBeNull();
    });

    it('will not delete a source with an unfinished run', function () {
        CrawlRun::factory()->create(['job_source_id' => $this->source->id, 'status' => CrawlRunStatus::Running]);

        $this->actingAs($this->admin)
            ->delete(route('admin.scraper.sources.destroy', $this->source))
            ->assertSessionHas('inertia.flash_data.toast.type', 'error');

        expect($this->source->refresh()->trashed())->toBeFalse();
    });
});

describe('crawl actions', function () {
    it('starts a crawl and opens its monitoring page', function () {
        $response = $this->actingAs($this->admin)->post(route('admin.scraper.sources.run', $this->source));

        $run = CrawlRun::query()->sole();
        $response->assertRedirect(route('admin.scraper.runs.show', $run))
            ->assertSessionHas('inertia.flash_data.toast.type', 'success');

        expect($run->triggered_by_user_id)->toBe($this->admin->id);
        Queue::assertPushed(RunCrawlJob::class);
    });

    it('explains why a source cannot run', function () {
        $pending = JobSource::factory()->pendingPermission()->create();

        $this->actingAs($this->admin)
            ->post(route('admin.scraper.sources.run', $pending))
            ->assertSessionHas('inertia.flash_data.toast.type', 'error');

        expect(CrawlRun::query()->count())->toBe(0);
    });

    it('retries a finished run', function () {
        $run = CrawlRun::factory()->failed()->create(['job_source_id' => $this->source->id]);

        $this->actingAs($this->admin)
            ->post(route('admin.scraper.runs.retry', $run))
            ->assertSessionHas('inertia.flash_data.toast.type', 'success');

        expect(CrawlRun::query()->where('retry_of_crawl_run_id', $run->id)->exists())->toBeTrue();
    });

    it('cancels queued runs and flags running ones', function () {
        $queued = CrawlRun::factory()->create(['job_source_id' => $this->source->id]);
        $running = CrawlRun::factory()->create(['status' => CrawlRunStatus::Running, 'started_at' => now()]);

        $this->actingAs($this->admin)->post(route('admin.scraper.runs.cancel', $queued))
            ->assertSessionHas('inertia.flash_data.toast.type', 'success');
        $this->actingAs($this->admin)->post(route('admin.scraper.runs.cancel', $running))
            ->assertSessionHas('inertia.flash_data.toast.type', 'warning');

        expect($queued->refresh()->status)->toBe(CrawlRunStatus::Cancelled)
            ->and($running->refresh()->summary['cancel_requested'])->toBeTrue();
    });

    it('will not cancel a finished run', function () {
        $run = CrawlRun::factory()->succeeded()->create();

        $this->actingAs($this->admin)->post(route('admin.scraper.runs.cancel', $run))
            ->assertSessionHas('inertia.flash_data.toast.type', 'error');
    });

    it('hides and restores a listing', function () {
        $listing = ScrapedJobListing::factory()->create();

        $this->actingAs($this->admin)->patch(route('admin.scraper.listings.visibility', $listing));
        expect($listing->refresh()->status)->toBe(ScrapedJobListingStatus::Hidden);

        $this->actingAs($this->admin)->patch(route('admin.scraper.listings.visibility', $listing));
        expect($listing->refresh()->status)->toBe(ScrapedJobListingStatus::Active);
    });
});
