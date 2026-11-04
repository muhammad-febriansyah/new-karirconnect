<?php

use App\Enums\CircuitState;
use App\Enums\CrawlErrorCategory;
use App\Enums\CrawlRunStatus;
use App\Enums\CrawlRunTrigger;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\JobSourceStatus;
use App\Enums\ScrapedJobListingStatus;
use App\Enums\WorkArrangement;
use App\Exceptions\Crawler\CrawlNotAllowedException;
use App\Jobs\DownloadScrapedCompanyLogoJob;
use App\Jobs\RunCrawlJob;
use App\Models\City;
use App\Models\CrawlRun;
use App\Models\JobCategory;
use App\Models\JobSource;
use App\Models\Province;
use App\Models\ScrapedCompany;
use App\Models\ScrapedJobListing;
use App\Models\ScrapedJobOrigin;
use App\Models\Skill;
use App\Services\Crawler\CrawlOrchestrator;
use App\Services\Crawler\DnsResolver;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Queue;

/**
 * Fake DNS: every host is public unless listed in $private.
 *
 * @param  list<string>  $private
 */
function fakeDns(array $private = []): void
{
    app()->instance(DnsResolver::class, new class($private) extends DnsResolver
    {
        /** @param list<string> $private */
        public function __construct(private array $private) {}

        public function resolve(string $host): array
        {
            return in_array($host, $this->private, true) ? ['10.0.0.8'] : ['93.184.216.34'];
        }
    });
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function workerItem(array $overrides = []): array
{
    return [
        'external_id' => '1001',
        'title' => 'Senior Backend Engineer',
        'apply_url' => 'https://job-boards.greenhouse.io/contohtek/jobs/1001',
        'source_url' => 'https://job-boards.greenhouse.io/contohtek/jobs/1001',
        'company_name' => null,
        'description' => '<p>Kami membangun platform logistik.</p><script>alert(1)</script>',
        'responsibilities' => '<ul><li>Membangun API</li></ul>',
        'requirements' => '<ul><li>Menguasai SQL dan Docker</li></ul>',
        'benefits' => '<ul><li>BPJS</li></ul>',
        'location_text' => 'Jakarta Selatan, Indonesia',
        'employment_type_raw' => 'Full-time',
        'workplace_type_raw' => 'Hybrid',
        'department_raw' => 'Engineering',
        'country_raw' => 'ID',
        'salary' => ['min' => 15000000, 'max' => 25000000, 'currency' => 'IDR', 'interval' => 'per-month-salary'],
        'skills_raw' => [],
        'published_at' => '2026-10-01T09:00:00+07:00',
        'updated_at' => '2026-10-28T12:00:00+07:00',
        'application_deadline' => '2099-12-31',
        ...$overrides,
    ];
}

/**
 * @param  list<array<string, mixed>>|null  $items
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function workerResponse(CrawlRun $run, ?array $items = null, array $overrides = []): array
{
    return [
        'contract_version' => 1,
        'run_uuid' => $run->uuid,
        'status' => 'succeeded',
        'engine_used' => 'api',
        'engines_attempted' => [['engine' => 'api', 'outcome' => 'ok', 'ms' => 120, 'items' => count($items ?? [1])]],
        'company' => [
            'name' => 'Contoh Teknologi',
            'domain' => null,
            'about' => '<p>Perusahaan logistik.</p>',
            'logo_url' => 'https://cdn.example.com/logo.png',
            'phone' => '+62 21 555 0100',
            'founded_year' => 2017,
            'size_raw' => null,
        ],
        'items' => $items ?? [workerItem()],
        'errors' => [],
        'stats' => ['pages' => 1, 'requests' => 3, 'rejected' => 0],
        ...$overrides,
    ];
}

/**
 * Queue a run and execute it against a faked worker that answers with
 * whatever $respond builds for that run.
 */
function crawlWith(JobSource $source, Closure $respond): CrawlRun
{
    $orchestrator = app(CrawlOrchestrator::class);
    $run = $orchestrator->queue($source, CrawlRunTrigger::Manual);

    Process::fake(['*' => Process::result(output: json_encode($respond($run)))]);

    $orchestrator->execute($run);

    return $run->refresh();
}

beforeEach(function () {
    Queue::fake();
    fakeDns();

    $this->category = JobCategory::query()->firstOrCreate(['name' => 'Engineering'], JobCategory::factory()->raw(['name' => 'Engineering']));
    $province = Province::factory()->create(['name' => 'DKI Jakarta']);
    $this->city = City::factory()->create(['name' => 'Kota Jakarta Selatan', 'province_id' => $province->id]);
    // The skill taxonomy is seeded by a migration, so these may already exist.
    $this->sql = Skill::query()->firstOrCreate(['name' => 'SQL'], Skill::factory()->raw(['name' => 'SQL']));
    $this->docker = Skill::query()->firstOrCreate(['name' => 'Docker'], Skill::factory()->raw(['name' => 'Docker']));
    $this->source = JobSource::factory()->create(['allowed_domains' => ['boards-api.greenhouse.io', 'job-boards.greenhouse.io']]);
});

describe('queueing', function () {
    it('queues a run on the crawler connection', function () {
        $run = app(CrawlOrchestrator::class)->queue($this->source, CrawlRunTrigger::Manual);

        expect($run->status)->toBe(CrawlRunStatus::Queued);
        Queue::assertPushedOn('crawler', RunCrawlJob::class, fn (RunCrawlJob $job) => $job->crawlRunId === $run->id
            && $job->connection === 'crawler');
    });

    it('refuses sources that may not run', function (JobSource $source) {
        app(CrawlOrchestrator::class)->queue($source, CrawlRunTrigger::Manual);
    })->with([
        'disabled' => fn () => JobSource::factory()->disabled()->create(),
        'pending permission' => fn () => JobSource::factory()->pendingPermission()->create(),
        'cooling down' => fn () => JobSource::factory()->create(['cooldown_until' => now()->addHour()]),
    ])->throws(CrawlNotAllowedException::class);

    it('refuses a second run while one is unfinished', function () {
        $orchestrator = app(CrawlOrchestrator::class);
        $orchestrator->queue($this->source, CrawlRunTrigger::Manual);

        $orchestrator->queue($this->source, CrawlRunTrigger::Manual);
    })->throws(CrawlNotAllowedException::class);
});

describe('a successful run', function () {
    it('calls the worker with a fixed argv and the request on stdin', function () {
        $run = crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run));

        Process::assertRan(function (PendingProcess $process) use ($run): bool {
            $request = json_decode($process->input, true);

            return $process->command === [base_path('crawler/.venv/bin/python'), '-m', 'karir_crawler.cli']
                && $process->path === base_path('crawler')
                && $process->environment['CRAWLER_IMAGE'] === config('crawler.docker.image')
                && $request['run_uuid'] === $run->uuid
                && $request['source']['type'] === 'greenhouse'
                && $request['engines'] === ['api'];
        });
    });

    it('stores listings with the same fields as job_posts', function () {
        $run = crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run));

        expect($run->status)->toBe(CrawlRunStatus::Succeeded)
            ->and($run->items_found)->toBe(1)
            ->and($run->items_created)->toBe(1);

        $listing = ScrapedJobListing::query()->sole();

        expect($listing->title)->toBe('Senior Backend Engineer')
            ->and($listing->job_category_id)->toBe($this->category->id)
            ->and($listing->city_id)->toBe($this->city->id)
            ->and($listing->province_id)->toBe($this->city->province_id)
            ->and($listing->employment_type)->toBe(EmploymentType::FullTime)
            ->and($listing->work_arrangement)->toBe(WorkArrangement::Hybrid)
            ->and($listing->experience_level)->toBe(ExperienceLevel::Senior)
            ->and($listing->min_education)->toBeNull()
            ->and($listing->salary_min)->toBe(15000000)
            ->and($listing->salary_currency)->toBe('IDR')
            ->and($listing->is_salary_visible)->toBeTrue()
            ->and($listing->application_deadline->toDateString())->toBe('2099-12-31')
            ->and($listing->description)->toContain('platform logistik')
            ->and($listing->description)->not->toContain('<script>')
            ->and($listing->requirements)->toContain('SQL')
            ->and($listing->raw_attributes['employment_type'])->toBe('Full-time')
            ->and($listing->skills->pluck('id')->sort()->values()->all())->toBe([$this->sql->id, $this->docker->id]);
    });

    it('stores the company profile and queues its logo download', function () {
        crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run));

        $company = ScrapedCompany::query()->sole();

        expect($company->name)->toBe('Contoh Teknologi')
            ->and($company->logo_url)->toBe('https://cdn.example.com/logo.png')
            ->and($company->phone)->toBe('+62 21 555 0100')
            ->and($company->founded_year)->toBe(2017)
            ->and($company->about)->toContain('logistik')
            ->and($company->profile_fetched_at)->not->toBeNull();

        Queue::assertPushedOn('crawler', DownloadScrapedCompanyLogoJob::class,
            fn (DownloadScrapedCompanyLogoJob $job) => $job->scrapedCompanyId === $company->id);
    });

    it('does not invent values the source did not give', function () {
        crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, [workerItem([
            'location_text' => 'Atlantis',
            'employment_type_raw' => null,
            'workplace_type_raw' => null,
            'department_raw' => 'Underwater Basket Weaving',
            'salary' => null,
            'title' => 'Backend Engineer',
            'published_at' => null,
            'application_deadline' => null,
        ])]));

        $listing = ScrapedJobListing::query()->sole();

        expect($listing->city_id)->toBeNull()
            ->and($listing->province_id)->toBeNull()
            ->and($listing->employment_type)->toBeNull()
            ->and($listing->work_arrangement)->toBeNull()
            ->and($listing->experience_level)->toBeNull()
            ->and($listing->job_category_id)->toBeNull()
            ->and($listing->salary_min)->toBeNull()
            ->and($listing->is_salary_visible)->toBeFalse()
            ->and($listing->published_at)->toBeNull();
    });

    it('updates the source schedule and success time', function () {
        crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run));

        $this->source->refresh();

        expect($this->source->last_run_at)->not->toBeNull()
            ->and($this->source->last_success_at)->not->toBeNull()
            ->and($this->source->consecutive_failures)->toBe(0);
    });
});

describe('idempotency and dedup', function () {
    it('re-crawling the same data adds nothing', function () {
        crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run));
        $second = crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run));

        expect($second->items_created)->toBe(0)
            ->and($second->items_unchanged)->toBe(1)
            ->and(ScrapedJobListing::query()->count())->toBe(1)
            ->and(ScrapedJobOrigin::query()->count())->toBe(1)
            ->and(ScrapedCompany::query()->count())->toBe(1);
    });

    it('counts a changed listing as updated', function () {
        crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run));
        $second = crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, [workerItem(['description' => '<p>Deskripsi baru.</p>'])]));

        expect($second->items_updated)->toBe(1)
            ->and(ScrapedJobListing::query()->sole()->description)->toContain('Deskripsi baru');
    });

    it('merges the same vacancy from two sources into one listing with two origins', function () {
        $lever = JobSource::factory()->lever()->create();

        crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run));
        $second = crawlWith($lever, fn (CrawlRun $run) => workerResponse($run, [workerItem([
            'external_id' => 'lever-abc',
            'apply_url' => 'https://jobs.lever.co/contohtek/lever-abc/apply',
            'source_url' => 'https://jobs.lever.co/contohtek/lever-abc',
        ])]));

        $listing = ScrapedJobListing::query()->sole();

        expect($second->items_created)->toBe(0)
            ->and($listing->job_source_id)->toBe($this->source->id)
            ->and($listing->origins()->pluck('job_source_id')->sort()->values()->all())
            ->toBe(collect([$this->source->id, $lever->id])->sort()->values()->all());
    });
});

describe('stale and partial results', function () {
    it('marks listings missing from a complete run as stale, and revives them when seen again', function () {
        crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, [workerItem(), workerItem(['external_id' => '1002', 'title' => 'Data Analyst'])]));
        $this->travel(1)->minutes();

        crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, [workerItem()]));

        expect(ScrapedJobListing::query()->where('external_id', '1002')->value('status'))->toBe(ScrapedJobListingStatus::Stale)
            ->and(ScrapedJobListing::query()->where('external_id', '1001')->value('status'))->toBe(ScrapedJobListingStatus::Active);

        $this->travel(1)->minutes();
        crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, [workerItem(), workerItem(['external_id' => '1002', 'title' => 'Data Analyst'])]));

        expect(ScrapedJobListing::query()->where('external_id', '1002')->value('status'))->toBe(ScrapedJobListingStatus::Active);
    });

    it('does not mark anything stale after a partial run', function (string $status) {
        crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, [workerItem(), workerItem(['external_id' => '1002', 'title' => 'Data Analyst'])]));
        $this->travel(1)->minutes();

        $run = crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, [workerItem()], ['status' => $status]));

        expect($run->status->value)->toBe($status)
            ->and(ScrapedJobListing::query()->where('status', ScrapedJobListingStatus::Stale)->count())->toBe(0);
    })->with(['partial', 'suspected_partial']);

    it('flags an abnormal drop against recent runs as suspected_partial', function () {
        $items = collect(range(1, 10))->map(fn (int $i) => workerItem(['external_id' => (string) $i, 'title' => "Role {$i}"]))->all();

        foreach (range(1, 3) as $round) {
            crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, $items));
            $this->travel(1)->minutes();
        }

        $dropped = crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, array_slice($items, 0, 2)));

        expect($dropped->status)->toBe(CrawlRunStatus::SuspectedPartial)
            ->and(ScrapedJobListing::query()->where('status', ScrapedJobListingStatus::Stale)->count())->toBe(0);
    });

    it('rejects items that fail Laravel validation and logs them', function () {
        $run = crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, [
            workerItem(),
            workerItem(['external_id' => '2', 'apply_url' => 'javascript:alert(1)']),
            workerItem(['external_id' => '3', 'title' => str_repeat('x', 200)]),
        ]));

        expect($run->items_rejected)->toBe(2)
            ->and($run->items_created)->toBe(1)
            ->and($run->errors()->where('category', CrawlErrorCategory::ValidationError)->count())->toBe(2);
    });
});

describe('failures, cooldowns and the circuit breaker', function () {
    it('puts an access-restricted source in cooldown', function () {
        $run = crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, [], [
            'status' => 'access_restricted',
            'errors' => [['engine' => 'api', 'category' => 'captcha', 'message' => 'CAPTCHA', 'http_status' => 403, 'retryable' => false]],
        ]));

        $this->source->refresh();

        expect($run->status)->toBe(CrawlRunStatus::AccessRestricted)
            ->and($run->errors()->sole()->category)->toBe(CrawlErrorCategory::Captcha)
            ->and($this->source->isCoolingDown())->toBeTrue()
            ->and($this->source->consecutive_failures)->toBe(1);
    });

    it('honours Retry-After as the cooldown', function () {
        crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, [], [
            'status' => 'failed',
            'errors' => [['engine' => 'api', 'category' => 'rate_limited', 'message' => '429', 'http_status' => 429, 'retry_after_s' => 1800]],
        ]));

        $minutes = now()->diffInMinutes($this->source->refresh()->cooldown_until);

        expect(round($minutes))->toEqual(30.0);
    });

    it('opens the circuit after repeated failures and closes it after a good trial', function () {
        foreach (range(1, 3) as $attempt) {
            crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, [], [
                'status' => 'failed',
                'errors' => [['engine' => 'api', 'category' => 'network', 'message' => 'HTTP 503']],
            ]));
        }

        $this->source->refresh();
        expect($this->source->circuit_state)->toBe(CircuitState::Open)
            ->and($this->source->isDue())->toBeFalse();

        $this->travel(3)->hours();

        $trial = crawlWith($this->source->refresh(), fn (CrawlRun $run) => workerResponse($run));

        expect($trial->status)->toBe(CrawlRunStatus::Succeeded)
            ->and($this->source->refresh()->circuit_state)->toBe(CircuitState::Closed)
            ->and($this->source->consecutive_failures)->toBe(0);
    });

    it('fails the run when the worker output breaks the contract', function () {
        $orchestrator = app(CrawlOrchestrator::class);
        $run = $orchestrator->queue($this->source, CrawlRunTrigger::Manual);
        Process::fake(['*' => Process::result(output: 'Traceback (most recent call last)', errorOutput: 'boom', exitCode: 1)]);

        $orchestrator->execute($run);

        expect($run->refresh()->status)->toBe(CrawlRunStatus::Failed)
            ->and($run->errors()->sole()->message)->toContain('bukan JSON');
    });

    it('blocks a base_url that resolves to a private address without running the worker', function () {
        fakeDns(['boards-api.greenhouse.io']);
        Process::fake();

        $orchestrator = app(CrawlOrchestrator::class);
        $run = $orchestrator->queue($this->source, CrawlRunTrigger::Manual);
        $orchestrator->execute($run);

        expect($run->refresh()->status)->toBe(CrawlRunStatus::Failed)
            ->and($run->errors()->sole()->category)->toBe(CrawlErrorCategory::SsrfBlocked);
        Process::assertNothingRan();
    });

    it('marks the run failed when the queued job crashes', function () {
        $run = app(CrawlOrchestrator::class)->queue($this->source, CrawlRunTrigger::Manual);

        (new RunCrawlJob($run->id))->failed(new RuntimeException('worker exploded'));

        expect($run->refresh()->status)->toBe(CrawlRunStatus::Failed)
            ->and($run->errors()->sole()->message)->toContain('worker exploded');
    });
});

describe('cancelling and retrying', function () {
    it('cancels a queued run so the job does nothing', function () {
        $orchestrator = app(CrawlOrchestrator::class);
        $run = $orchestrator->queue($this->source, CrawlRunTrigger::Manual);
        Process::fake();

        expect($orchestrator->cancel($run))->toBeTrue();
        $orchestrator->execute($run);

        expect($run->refresh()->status)->toBe(CrawlRunStatus::Cancelled);
        Process::assertNothingRan();
    });

    it('throws away the result of a run cancelled while running', function () {
        $orchestrator = app(CrawlOrchestrator::class);
        $run = $orchestrator->queue($this->source, CrawlRunTrigger::Manual);

        Process::fake(function () use ($orchestrator, $run) {
            // The admin presses cancel while the worker is busy.
            $orchestrator->cancel($run->refresh());

            return Process::result(output: json_encode(workerResponse($run)));
        });

        $orchestrator->execute($run);

        expect($run->refresh()->status)->toBe(CrawlRunStatus::Cancelled)
            ->and(ScrapedJobListing::query()->count())->toBe(0);
    });

    it('retries a finished run as a new linked run', function () {
        $first = crawlWith($this->source, fn (CrawlRun $run) => workerResponse($run, [], ['status' => 'failed']));

        $retry = app(CrawlOrchestrator::class)->retry($first);

        expect($retry->trigger)->toBe(CrawlRunTrigger::Retry)
            ->and($retry->retry_of_crawl_run_id)->toBe($first->id);
    });
});

describe('crawler:dispatch-due', function () {
    it('queues only active sources that are due', function () {
        $due = $this->source;
        JobSource::factory()->create(['last_run_at' => now()->subMinutes(5), 'schedule_minutes' => 60]);
        JobSource::factory()->disabled()->create();
        JobSource::factory()->pendingPermission()->create();
        JobSource::factory()->circuitOpen()->create();
        JobSource::factory()->create(['cooldown_until' => now()->addHour()]);

        $this->artisan('crawler:dispatch-due')->assertSuccessful();

        expect(CrawlRun::query()->pluck('job_source_id')->all())->toBe([$due->id]);
        Queue::assertPushed(RunCrawlJob::class, 1);
    });

    it('does not queue a source twice', function () {
        $this->artisan('crawler:dispatch-due')->assertSuccessful();
        $this->artisan('crawler:dispatch-due')->assertSuccessful();

        expect(CrawlRun::query()->count())->toBe(1);
    });

    it('is scheduled every five minutes without overlap', function () {
        $event = collect(app(Schedule::class)->events())
            ->first(fn ($event) => str_contains((string) $event->command, 'crawler:dispatch-due'));

        expect($event)->not->toBeNull()
            ->and($event->expression)->toBe('*/5 * * * *')
            ->and($event->withoutOverlapping)->toBeTrue();
    });
});

it('never lets a source without permission run, whatever the trigger', function () {
    $source = JobSource::factory()->create(['status' => JobSourceStatus::PendingPermission]);

    expect(fn () => app(CrawlOrchestrator::class)->queue($source, CrawlRunTrigger::Manual))
        ->toThrow(CrawlNotAllowedException::class);
    $this->artisan('crawler:run', ['source' => $source->slug])->assertFailed();
    expect(CrawlRun::query()->count())->toBe(0);
});
