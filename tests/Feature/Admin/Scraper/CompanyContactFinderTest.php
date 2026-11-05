<?php

use App\Enums\CrawlRunTrigger;
use App\Jobs\FindCompanyContactJob;
use App\Models\ScrapedCompany;
use App\Models\User;
use App\Services\Crawler\CompanyContactFinder;
use App\Services\Crawler\CrawlOrchestrator;
use App\Services\Crawler\DnsResolver;
use App\Services\ExternalJobs\ExternalSourceCatalog;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    app()->instance(DnsResolver::class, new class extends DnsResolver
    {
        public function resolve(string $host): array
        {
            return ['93.184.216.34'];
        }

        public function acceptsMail(string $domain): bool
        {
            return $domain !== 'tanpa-mx.co.id';
        }
    });
});

/**
 * Fake the worker's company_contact answer and echo the request's run_uuid.
 *
 * @param  array<string, mixed>  $answer
 */
function fakeContactWorker(array $answer): void
{
    Process::fake(function (PendingProcess $process) use ($answer) {
        $request = json_decode((string) $process->input, true);

        return Process::result(output: json_encode([
            'contract_version' => 1, 'run_uuid' => $request['run_uuid'], 'status' => 'succeeded',
            'website' => $request['website'], 'recruitment_email' => null, 'recruitment_email_url' => null,
            'general_email' => null, 'pages' => 2, 'errors' => [], ...$answer,
        ]));
    });
}

it('stores the recruitment email found on the company website', function () {
    $company = ScrapedCompany::factory()->create(['website' => 'https://www.contoh.co.id', 'recruitment_email' => null, 'email' => null]);
    fakeContactWorker(['recruitment_email' => 'hrd@contoh.co.id', 'recruitment_email_url' => 'https://www.contoh.co.id/karir', 'general_email' => 'info@contoh.co.id']);

    app(CompanyContactFinder::class)->find($company);

    $company->refresh();
    expect($company->recruitment_email)->toBe('hrd@contoh.co.id')
        ->and($company->recruitment_email_source)->toBe('https://www.contoh.co.id/karir')
        ->and($company->email)->toBe('info@contoh.co.id')
        ->and($company->contact_checked_at)->not->toBeNull();

    Process::assertRan(function (PendingProcess $process) {
        $request = json_decode((string) $process->input, true);

        return $request['mode'] === 'company_contact' && $request['website'] === 'https://www.contoh.co.id';
    });
});

it('never uses a general mailbox or a domain without mail servers for applications', function () {
    $company = ScrapedCompany::factory()->create(['website' => 'https://tanpa-mx.co.id', 'recruitment_email' => null]);
    fakeContactWorker(['recruitment_email' => 'hr@tanpa-mx.co.id', 'general_email' => 'info@tanpa-mx.co.id']);

    app(CompanyContactFinder::class)->find($company);

    expect($company->refresh()->recruitment_email)->toBeNull()
        ->and($company->contact_checked_at)->not->toBeNull();
});

it('skips job boards and social networks given as the website', function () {
    Process::fake();
    $company = ScrapedCompany::factory()->create(['website' => 'https://dealls.com/company/contoh', 'recruitment_email' => null]);

    expect(app(CompanyContactFinder::class)->isDue($company))->toBeFalse()
        ->and(app(CompanyContactFinder::class)->find($company)['status'])->toBe('skipped');
    Process::assertNothingRan();
});

it('searches again only after the recheck period', function () {
    $finder = app(CompanyContactFinder::class);
    $company = ScrapedCompany::factory()->create(['website' => 'https://contoh.co.id', 'recruitment_email' => null, 'contact_checked_at' => now()->subDays(3)]);

    expect($finder->isDue($company))->toBeFalse();

    $company->update(['contact_checked_at' => now()->subDays(31)]);
    expect($finder->isDue($company))->toBeTrue();

    $company->update(['recruitment_email' => 'hr@contoh.co.id']);
    expect($finder->isDue($company))->toBeFalse();
});

it('queues searches for companies without an email from the command', function () {
    Queue::fake();
    $due = ScrapedCompany::factory()->create(['website' => 'https://contoh.co.id', 'recruitment_email' => null]);
    $byName = ScrapedCompany::factory()->create(['name' => 'PT Contoh Karya', 'website' => null, 'recruitment_email' => null]);
    ScrapedCompany::factory()->create(['name' => 'Zone', 'website' => null, 'recruitment_email' => null]);
    ScrapedCompany::factory()->create(['website' => 'https://lain.co.id', 'recruitment_email' => 'hr@lain.co.id']);

    $this->artisan('crawler:find-contacts')->assertSuccessful();

    Queue::assertPushed(FindCompanyContactJob::class, 2);
    Queue::assertPushed(FindCompanyContactJob::class, fn (FindCompanyContactJob $job) => $job->scrapedCompanyId === $due->id);
    Queue::assertPushed(FindCompanyContactJob::class, fn (FindCompanyContactJob $job) => $job->scrapedCompanyId === $byName->id);
});

it('lets an admin start a search from the listing page', function () {
    Queue::fake();
    $admin = User::factory()->admin()->create();
    $company = ScrapedCompany::factory()->create(['website' => 'https://contoh.co.id', 'contact_checked_at' => now()]);

    $this->actingAs($admin)
        ->post(route('admin.scraper.companies.find-recruitment-email', $company))
        ->assertSessionHas('inertia.flash_data.toast.type', 'info');

    // A manual search runs even when the company was checked recently.
    Queue::assertPushed(FindCompanyContactJob::class, fn (FindCompanyContactJob $job) => $job->force);

    $this->actingAs(User::factory()->employer()->create())
        ->post(route('admin.scraper.companies.find-recruitment-email', $company))
        ->assertForbidden();
});

it('finds the website from the name, keeping it only when it gave an email', function () {
    $company = ScrapedCompany::factory()->create(['name' => 'PT Contoh Karya', 'website' => null, 'recruitment_email' => null]);
    fakeContactWorker(['website' => 'https://contohkarya.id/', 'website_guessed' => true, 'recruitment_email' => 'hrd@contohkarya.id', 'recruitment_email_url' => 'https://contohkarya.id/karir']);

    app(CompanyContactFinder::class)->find($company);

    Process::assertRan(fn (PendingProcess $process) => json_decode((string) $process->input, true)['company_name'] === 'PT Contoh Karya');
    expect($company->refresh()->website)->toBe('https://contohkarya.id/')
        ->and($company->recruitment_email)->toBe('hrd@contohkarya.id');

    $other = ScrapedCompany::factory()->create(['name' => 'PT Lain Sekali', 'website' => null, 'recruitment_email' => null]);
    fakeContactWorker(['website' => 'https://lainsekali.id/', 'website_guessed' => true, 'general_email' => 'info@lainsekali.id']);

    app(CompanyContactFinder::class)->find($other);

    expect($other->refresh()->website)->toBeNull()
        ->and($other->email)->toBeNull();
});

it('queues a website search when a crawl brings a company without an email', function () {
    Queue::fake();
    $source = app(ExternalSourceCatalog::class)->sourceForEntry('dealls');
    $run = app(CrawlOrchestrator::class)->queue($source, CrawlRunTrigger::Manual);
    $item = fn (string $id) => [
        'external_id' => $id, 'title' => 'Staf '.$id, 'apply_url' => "https://dealls.com/loker/{$id}~jakmall",
        'source_url' => "https://dealls.com/loker/{$id}~jakmall", 'company_name' => 'Jakmall',
        'company_website' => 'https://jakmall.com', 'description' => '<p>Kerja</p>', 'location_text' => 'Jakarta Selatan, Indonesia',
    ];
    Process::fake(['*' => Process::result(output: json_encode([
        'contract_version' => 1, 'run_uuid' => $run->uuid, 'status' => 'succeeded', 'engine_used' => 'http',
        'engines_attempted' => [], 'errors' => [], 'stats' => [], 'company' => null,
        'items' => [$item('a1'), $item('a2')],
    ]))]);

    app(CrawlOrchestrator::class)->execute($run);

    // Two postings, one employer: searched once.
    Queue::assertPushed(FindCompanyContactJob::class, 1);
});

it('forwards applications to the company email when there is no recruitment one', function () {
    $company = ScrapedCompany::factory()->create(['recruitment_email' => null, 'email' => 'Info@Contoh.co.id']);
    expect($company->applicationEmail())->toBe('info@contoh.co.id');

    $company->update(['recruitment_email' => 'hr@contoh.co.id']);
    expect($company->refresh()->applicationEmail())->toBe('hr@contoh.co.id');

    $company->update(['recruitment_email' => null, 'email' => null]);
    expect($company->refresh()->applicationEmail())->toBeNull();
});

it('keeps the general email of a known website only when its domain takes mail', function () {
    $company = ScrapedCompany::factory()->create(['website' => 'https://tanpa-mx.co.id', 'recruitment_email' => null, 'email' => null]);
    fakeContactWorker(['general_email' => 'info@tanpa-mx.co.id']);

    app(CompanyContactFinder::class)->find($company);

    expect($company->refresh()->email)->toBeNull();
});

it('searches again with --force companies that still have no email', function () {
    Queue::fake();
    $checked = ScrapedCompany::factory()->create(['website' => 'https://contoh.co.id', 'recruitment_email' => null, 'email' => null, 'contact_checked_at' => now()]);
    ScrapedCompany::factory()->create(['website' => 'https://lain.co.id', 'recruitment_email' => null, 'email' => 'info@lain.co.id', 'contact_checked_at' => now()]);

    $this->artisan('crawler:find-contacts')->assertSuccessful();
    Queue::assertNothingPushed();

    $this->artisan('crawler:find-contacts --force')->assertSuccessful();
    Queue::assertPushed(FindCompanyContactJob::class, 1);
    Queue::assertPushed(FindCompanyContactJob::class, fn (FindCompanyContactJob $job) => $job->scrapedCompanyId === $checked->id && $job->force);
});
