<?php

use App\Enums\CompanyStatus;
use App\Enums\CrawlRunStatus;
use App\Enums\EmploymentType;
use App\Enums\JobStatus;
use App\Enums\ScrapedJobListingStatus;
use App\Jobs\RelayExternalApplicationJob;
use App\Jobs\RunCrawlJob;
use App\Mail\ExternalApplicationRelayed;
use App\Models\Application;
use App\Models\CandidateCv;
use App\Models\CrawlRun;
use App\Models\Education;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\JobSource;
use App\Models\ScrapedCompany;
use App\Models\ScrapedJobListing;
use App\Models\ScrapedJobOrigin;
use App\Models\Skill;
use App\Models\User;
use App\Models\WorkExperience;
use App\Services\Crawler\ListingAttributeMapper;
use App\Services\Crawler\ListingIngestor;
use App\Services\ExternalJobs\ExternalCompanyProvisioner;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->category = JobCategory::factory()->create();
    $this->company = ScrapedCompany::factory()->create(['name' => 'PT Contoh Teknologi', 'logo_path' => null]);
    $this->source = JobSource::factory()->create();
});

function externalListing(array $overrides = []): ScrapedJobListing
{
    return ScrapedJobListing::factory()->create([
        'job_source_id' => test()->source->id,
        'scraped_company_id' => test()->company->id,
        'job_category_id' => test()->category->id,
        ...$overrides,
    ]);
}

function publishDefaults(array $overrides = []): array
{
    return ['employment_type' => 'full_time', 'work_arrangement' => 'onsite', 'experience_level' => 'mid', ...$overrides];
}

describe('publishing', function () {
    it('publishes selected listings as portal jobs under the employer name', function () {
        $listing = externalListing(['title' => 'Backend Engineer', 'experience_level' => null, 'employment_type' => EmploymentType::Contract]);

        $this->actingAs($this->admin)
            ->postJson(route('admin.scraper.listings.publish'), publishDefaults(['listing_ids' => [$listing->id], 'experience_level' => 'senior']))
            ->assertOk()
            ->assertJsonPath('type', 'success')
            ->assertJsonCount(1, 'published');

        $job = Job::query()->where('scraped_job_listing_id', $listing->id)->sole();

        expect($job->status)->toBe(JobStatus::Published)
            ->and($job->title)->toBe('Backend Engineer')
            ->and($job->employment_type)->toBe(EmploymentType::Contract) // the source's value wins
            ->and($job->experience_level->value)->toBe('senior') // admin fallback for a missing value
            ->and($job->external_apply_url)->toBe($listing->apply_url)
            ->and($job->company->name)->toBe('PT Contoh Teknologi')
            ->and($job->company->status)->toBe(CompanyStatus::Approved)
            ->and($job->company->owner->email)->toBe(config('external_jobs.owner_email'))
            ->and($job->company->owner->is_active)->toBeFalse()
            ->and($this->company->refresh()->company_id)->toBe($job->company_id);

        $this->get(route('public.jobs.show', $job->slug))->assertOk();
    });

    it('never publishes the same listing twice', function () {
        $listing = externalListing();

        foreach (range(1, 2) as $attempt) {
            $this->actingAs($this->admin)->postJson(route('admin.scraper.listings.publish'), publishDefaults(['listing_ids' => [$listing->id]]));
        }

        expect(Job::query()->where('scraped_job_listing_id', $listing->id)->count())->toBe(1);
    });

    it('skips a title already open for the same company', function () {
        $first = externalListing(['title' => 'Data Analyst']);
        $second = externalListing(['title' => 'data analyst']);

        $response = $this->actingAs($this->admin)
            ->postJson(route('admin.scraper.listings.publish'), publishDefaults(['listing_ids' => [$first->id, $second->id]]))
            ->assertJsonPath('type', 'warning');

        expect($response->json('skipped.0.reason'))->toContain('judul yang sama')
            ->and(Job::query()->count())->toBe(1);
    });

    it('publishes with only a selection, filling in what the source did not state', function () {
        $retail = JobCategory::factory()->create(['name' => 'Retail', 'is_active' => true]);
        $listing = externalListing([
            'title' => 'Retail Manager (Palembang)',
            'job_category_id' => null,
            'employment_type' => null,
            'work_arrangement' => null,
            'experience_level' => null,
        ]);

        $this->actingAs($this->admin)
            ->postJson(route('admin.scraper.listings.publish'), ['listing_ids' => [$listing->id]])
            ->assertJsonPath('type', 'success');

        $job = Job::query()->sole();
        expect($job->job_category_id)->toBe($retail->id)
            ->and($job->employment_type)->toBe(EmploymentType::FullTime)
            ->and($job->work_arrangement->value)->toBe('onsite')
            ->and($job->experience_level->value)->toBe('mid')
            ->and($listing->refresh()->job_category_id)->toBe($retail->id);
    });

    it('skips a listing whose category cannot be told from the title', function () {
        $listing = externalListing(['title' => 'Penjaga Mercusuar', 'job_category_id' => null]);

        $this->actingAs($this->admin)
            ->postJson(route('admin.scraper.listings.publish'), publishDefaults(['listing_ids' => [$listing->id]]))
            ->assertJsonPath('type', 'error');

        $this->actingAs($this->admin)
            ->postJson(route('admin.scraper.listings.publish'), publishDefaults(['listing_ids' => [$listing->id], 'job_category_id' => $this->category->id]))
            ->assertJsonPath('type', 'success');
    });

    it('skips inactive and expired listings', function () {
        $stale = externalListing(['status' => ScrapedJobListingStatus::Stale]);
        $expired = externalListing(['application_deadline' => now()->subDay()]);

        $response = $this->actingAs($this->admin)
            ->postJson(route('admin.scraper.listings.publish'), publishDefaults(['listing_ids' => [$stale->id, $expired->id]]));

        expect($response->json('skipped'))->toHaveCount(2)
            ->and(Job::query()->count())->toBe(0);
    });

    it('publishes everything matching the filters', function () {
        externalListing(['title' => 'Engineer A']);
        externalListing(['title' => 'Engineer B']);
        externalListing(['title' => 'Akuntan']);

        $this->actingAs($this->admin)
            ->post(route('admin.scraper.listings.publish'), publishDefaults(['all_matching' => true, 'filters' => ['search' => 'engineer']]))
            ->assertSessionHas('inertia.flash_data.toast.type', 'success');

        expect(Job::query()->pluck('title')->sort()->values()->all())->toBe(['Engineer A', 'Engineer B']);
    });

    it('copies the company logo into its own file', function () {
        Storage::fake('public');
        Storage::disk('public')->put('scraped-companies/logos/1-abc.png', 'png');
        $this->company->update(['logo_path' => 'scraped-companies/logos/1-abc.png']);

        $company = app(ExternalCompanyProvisioner::class)->companyFor($this->company->refresh());

        expect($company->logo_path)->not->toBe($this->company->logo_path);
        Storage::disk('public')->assertExists($company->logo_path);
    });

    it('closes the portal job when the source listing disappears', function () {
        $listing = externalListing();
        $this->actingAs($this->admin)->postJson(route('admin.scraper.listings.publish'), publishDefaults(['listing_ids' => [$listing->id]]));
        $run = CrawlRun::factory()->succeeded()->create(['job_source_id' => $this->source->id, 'started_at' => now()->addMinute()]);

        app(ListingIngestor::class)->markUnseen($this->source, $run);

        expect(Job::query()->sole()->status)->toBe(JobStatus::Closed);
    });

    it('is admin only', function () {
        $this->actingAs(User::factory()->employer()->create())
            ->postJson(route('admin.scraper.listings.publish'), publishDefaults(['listing_ids' => [externalListing()->id]]))
            ->assertForbidden();
    });
});

describe('scrape dialog endpoints', function () {
    it('queues a run per source and reports progress and results', function () {
        Queue::fake();

        $runs = $this->actingAs($this->admin)
            ->postJson(route('admin.scraper.scrape.start'), ['source_ids' => [$this->source->id]])
            ->assertOk()
            ->json('runs');

        Queue::assertPushed(RunCrawlJob::class);
        $runId = $runs[0]['id'];

        $this->actingAs($this->admin)
            ->getJson(route('admin.scraper.scrape.status', ['runs' => (string) $runId]))
            ->assertJsonPath('finished', false)
            ->assertJsonPath('runs.0.status', 'queued');

        CrawlRun::query()->whereKey($runId)->update(['status' => CrawlRunStatus::Succeeded, 'started_at' => now()->subMinute(), 'finished_at' => now()]);
        $listing = externalListing(['first_seen_at' => now()]);
        ScrapedJobOrigin::factory()->create(['scraped_job_listing_id' => $listing->id, 'job_source_id' => $this->source->id, 'external_id' => $listing->external_id, 'last_crawl_run_id' => $runId]);
        externalListing(); // seen by no run in this dialog

        $this->actingAs($this->admin)->getJson(route('admin.scraper.scrape.status', ['runs' => (string) $runId]))->assertJsonPath('finished', true);

        $this->actingAs($this->admin)
            ->getJson(route('admin.scraper.scrape.results', ['runs' => (string) $runId]))
            ->assertJsonPath('total', 1)
            ->assertJsonPath('listings.0.id', $listing->id)
            ->assertJsonPath('listings.0.is_new', true)
            ->assertJsonPath('listings.0.published_job', null);
    });

    it('follows an unfinished run instead of starting a duplicate', function () {
        Queue::fake();
        $running = CrawlRun::factory()->create(['job_source_id' => $this->source->id, 'status' => CrawlRunStatus::Running]);

        $this->actingAs($this->admin)
            ->postJson(route('admin.scraper.scrape.start'), ['source_ids' => [$this->source->id]])
            ->assertJsonPath('runs.0.id', $running->id);

        expect(CrawlRun::query()->count())->toBe(1);
    });

    it('reports sources that cannot run', function () {
        Queue::fake();
        $pending = JobSource::factory()->pendingPermission()->create();

        $this->actingAs($this->admin)
            ->postJson(route('admin.scraper.scrape.start'), ['source_ids' => [$pending->id]])
            ->assertJsonCount(0, 'runs')
            ->assertJsonCount(1, 'skipped');
    });

    it('renders Jobs Eksternal with sources and publish options', function () {
        externalListing();

        $this->actingAs($this->admin)
            ->get(route('admin.scraper.listings.index', ['published' => 'no']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/scraper/listings/index')
                ->where('publishableCount', 1)
                ->has('scrapeSources.catalog', collect(config('job_catalog.sources'))->reject(fn ($entry) => $entry['hidden'] ?? false)->count())
                ->where('scrapeSources.catalog.0.key', 'dealls')
                ->where('filters.published', 'no'));
    });
});

describe('applying to external jobs', function () {
    function publishedExternalJob(?string $recruitmentEmail): Job
    {
        test()->company->update(['recruitment_email' => $recruitmentEmail]);
        $listing = externalListing();
        test()->actingAs(test()->admin)->postJson(route('admin.scraper.listings.publish'), publishDefaults(['listing_ids' => [$listing->id]]));

        return Job::query()->where('scraped_job_listing_id', $listing->id)->sole();
    }

    function readyCandidate(bool $withCv = true): User
    {
        $user = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $user->id, 'profile_completion' => 80]);

        if ($withCv) {
            Storage::disk('public')->put('candidate-cvs/budi.pdf', '%PDF-1.4 cv');
            $cv = CandidateCv::factory()->create(['employee_profile_id' => $profile->id, 'file_path' => 'candidate-cvs/budi.pdf']);
            $profile->update(['primary_resume_id' => $cv->id]);
        }

        return $user;
    }

    it('requires a CV before relaying an application', function () {
        Storage::fake('public');
        Mail::fake();
        $job = publishedExternalJob('rekrutmen@contohtek.co.id');
        $candidate = readyCandidate(withCv: false);

        $this->actingAs($candidate)
            ->post(route('public.jobs.apply.store', $job->slug), ['cover_letter' => '<p>Saya tertarik.</p>'])
            ->assertSessionHasErrors('candidate_cv_id');

        expect(Application::query()->count())->toBe(0);
        Mail::assertNothingSent();
    });

    it('relays the application by email when the company has a recruitment email', function () {
        Storage::fake('public');
        Mail::fake();
        Notification::fake();
        $job = publishedExternalJob('rekrutmen@contohtek.co.id');
        $candidate = readyCandidate();

        $this->actingAs($candidate)->get(route('public.jobs.apply.create', $job->slug))
            ->assertInertia(fn (Assert $page) => $page->where('job.relayed_to_company', true));

        $this->actingAs($candidate)
            ->post(route('public.jobs.apply.store', $job->slug), ['cover_letter' => '<p>Saya tertarik.</p>'])
            ->assertRedirect();

        $application = Application::query()->sole();

        Mail::assertSent(ExternalApplicationRelayed::class, fn (ExternalApplicationRelayed $mail) => $mail->hasTo('rekrutmen@contohtek.co.id')
            && $mail->hasReplyTo($candidate->email)
            && $mail->hasFrom((string) config('mail.from.address'), $candidate->name));

        // Reads as a plain letter from the candidate: no platform branding.
        $mail = new ExternalApplicationRelayed($application);

        // The CV the candidate chose goes along as an attachment.
        expect(collect($mail->attachments())->map(fn ($attachment) => $attachment->as)->all())
            ->toBe(['CV-'.Str::slug($candidate->name).'.pdf']);
        expect($mail->attachments()[0]->attachWith(fn (string $path) => file_get_contents($path), fn (Closure $data) => $data()))
            ->toBe('%PDF-1.4 cv');
        $mail->assertSeeInHtml('bermaksud mengajukan lamaran untuk posisi')
            ->assertSeeInHtml('Saya tertarik.')
            ->assertSeeInText($candidate->name)
            ->assertDontSeeInHtml('KarirConnect')
            ->assertDontSeeInText('KarirConnect')
            ->assertDontSeeInHtml((string) config('app.name'));
        expect($mail->envelope()->subject)->not->toContain('KarirConnect');
        Notification::assertNothingSent();
        expect($application->refresh()->relayed_at)->not->toBeNull();
    });

    it('fills the relayed letter from the candidate profile', function () {
        config(['external_jobs.relay_from_address' => 'lamaran@kirim.example']);
        $job = publishedExternalJob('rekrutmen@contohtek.co.id');
        $candidate = User::factory()->employee()->create(['name' => 'Budi Santoso', 'phone' => '081234567890']);
        $profile = EmployeeProfile::factory()->create([
            'user_id' => $candidate->id,
            'headline' => 'Sales B2B berpengalaman',
            'current_position' => 'Account Executive',
            'linkedin_url' => 'https://www.linkedin.com/in/budi',
            'portfolio_url' => 'javascript:alert(1)',
        ]);
        WorkExperience::factory()->create([
            'employee_profile_id' => $profile->id, 'position' => 'Account Executive', 'company_name' => 'PT Maju',
            'start_date' => '2022-01-01', 'end_date' => null, 'is_current' => true,
        ]);
        Education::factory()->create([
            'employee_profile_id' => $profile->id, 'level' => 's1', 'major' => 'Manajemen', 'institution' => 'Universitas Indonesia', 'end_year' => 2020,
        ]);
        $profile->skills()->attach(Skill::factory()->create(['name' => 'Negosiasi Korporat', 'slug' => 'negosiasi-korporat'])->id);
        $application = Application::factory()->create([
            'job_id' => $job->id, 'employee_profile_id' => $profile->id, 'cover_letter' => '<p>Halo</p>', 'expected_salary' => 6000000,
        ]);

        $mail = new ExternalApplicationRelayed($application);

        expect($mail->envelope()->from->address)->toBe('lamaran@kirim.example')
            ->and($mail->envelope()->from->name)->toBe('Budi Santoso');
        $mail->assertSeeInOrderInHtml(['Budi Santoso', 'Universitas Indonesia', 'Rp 6.000.000', 'Negosiasi Korporat', '081234567890'])
            ->assertSeeInHtml('Saat ini saya bekerja sebagai Account Executive di PT Maju')
            ->assertSeeInHtml('sekarang')
            ->assertSeeInHtml('Universitas Indonesia')
            ->assertSeeInHtml('Negosiasi Korporat')
            ->assertSeeInHtml('https://www.linkedin.com/in/budi')
            ->assertDontSeeInHtml('javascript:')
            ->assertSeeInText('Riwayat pekerjaan:');
    });

    it('keeps an external job off the portal while its company has no email', function () {
        $this->company->update(['recruitment_email' => null, 'email' => null]);
        $listing = externalListing();

        $this->actingAs($this->admin)
            ->postJson(route('admin.scraper.listings.publish'), publishDefaults(['listing_ids' => [$listing->id]]))
            ->assertJsonCount(0, 'published')
            ->assertJsonPath('skipped.0.reason', fn (string $reason) => str_contains($reason, 'Belum ada email'));

        expect(Job::query()->count())->toBe(0);
    });

    it('hides a published job when the email goes and shows it again when one is found', function () {
        $job = publishedExternalJob('rekrutmen@contohtek.co.id');

        $this->company->update(['recruitment_email' => null, 'email' => null]);
        expect($job->refresh()->status)->toBe(JobStatus::Draft);
        $this->get(route('public.jobs.show', $job->slug))->assertNotFound();

        $this->company->update(['email' => 'info@contohtek.co.id']);
        expect($job->refresh()->status)->toBe(JobStatus::Published);
    });

    it('hides already published jobs without an email from the daily command', function () {
        Queue::fake();
        $job = publishedExternalJob('rekrutmen@contohtek.co.id');
        ScrapedCompany::query()->whereKey($this->company->id)->update(['recruitment_email' => null, 'email' => null]);

        $this->artisan('crawler:find-contacts')->assertSuccessful();

        expect($job->refresh()->status)->toBe(JobStatus::Draft);
    });

    it('records why a relay could not be sent', function () {
        $job = publishedExternalJob('rekrutmen@contohtek.co.id');
        $application = Application::factory()->create(['job_id' => $job->id]);
        $this->company->update(['recruitment_email' => null, 'email' => null]);

        (new RelayExternalApplicationJob($application->id))->handle();

        expect($application->refresh()->relayed_at)->toBeNull()
            ->and($application->relay_error)->toContain('email untuk menerima lamaran');
    });
});

it('reads seniority only from unambiguous title words', function (string $title, ?string $level) {
    expect(app(ListingAttributeMapper::class)->experienceLevel($title)?->value)->toBe($level);
})->with([
    ['Staff Accountant', null],
    ['Senior Backend Engineer', 'senior'],
    ['Lead Designer', 'lead'],
    ['Software Engineering Intern', 'entry'],
    ['Head of People', 'executive'],
]);
