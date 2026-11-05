<?php

use App\Enums\CrawlRunTrigger;
use App\Enums\EmploymentType;
use App\Models\Application;
use App\Models\AuditLog;
use App\Models\City;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\JobSource;
use App\Models\Province;
use App\Models\ScrapedJobListing;
use App\Models\ScrapedJobOrigin;
use App\Models\User;
use App\Services\Crawler\CrawlOrchestrator;
use App\Services\Crawler\DnsResolver;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Queue::fake();
    app()->instance(DnsResolver::class, new class extends DnsResolver
    {
        public function resolve(string $host): array
        {
            return ['93.184.216.34'];
        }
    });
    $this->admin = User::factory()->admin()->create();
    $this->source = JobSource::factory()->create();
    $this->listing = ScrapedJobListing::factory()->create(['job_source_id' => $this->source->id, 'title' => 'Staf Gudang']);
    ScrapedJobOrigin::factory()->create(['scraped_job_listing_id' => $this->listing->id]);
});

function editPayload(array $overrides = []): array
{
    return [
        'title' => 'Staf Gudang Senior',
        'job_category_id' => '',
        'employment_type' => 'contract',
        'work_arrangement' => 'none',
        'experience_level' => '',
        'min_education' => '',
        'province_id' => '',
        'city_id' => '',
        'location_text' => 'Bekasi',
        'salary_min' => 5000000,
        'salary_max' => 7000000,
        'salary_currency' => 'idr',
        'is_salary_visible' => true,
        'application_deadline' => null,
        'apply_url' => 'https://contoh.co.id/lamar',
        'contact_email' => 'hrd@contoh.co.id',
        'description' => '<p>Kelola stok</p><script>alert(1)</script>',
        'responsibilities' => '',
        'requirements' => '<ul><li>SMA</li></ul>',
        'benefits' => '',
        ...$overrides,
    ];
}

it('shows the edit page with options', function () {
    $this->actingAs($this->admin)
        ->get(route('admin.scraper.listings.edit', $this->listing))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/scraper/listings/edit')
            ->where('listing.title', 'Staf Gudang')
            ->has('options.employmentTypes')
            ->has('options.cities'));
});

it('saves edits, sanitises html and records who edited', function () {
    $this->actingAs($this->admin)
        ->put(route('admin.scraper.listings.update', $this->listing), editPayload())
        ->assertRedirect(route('admin.scraper.listings.show', $this->listing))
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    $this->listing->refresh();

    expect($this->listing->title)->toBe('Staf Gudang Senior')
        ->and($this->listing->employment_type)->toBe(EmploymentType::Contract)
        ->and($this->listing->work_arrangement)->toBeNull()
        ->and($this->listing->salary_currency)->toBe('IDR')
        ->and($this->listing->description)->not->toContain('<script>')
        ->and($this->listing->responsibilities)->toBeNull()
        ->and($this->listing->edited_at)->not->toBeNull()
        ->and($this->listing->edited_by_user_id)->toBe($this->admin->id)
        ->and(AuditLog::query()->where('action', 'scraped_listing.update')->exists())->toBeTrue();
});

it('validates the city belongs to the province and salary order', function () {
    $city = City::factory()->create(['province_id' => Province::factory()->create()->id]);

    $this->actingAs($this->admin)
        ->put(route('admin.scraper.listings.update', $this->listing), editPayload([
            'province_id' => (string) Province::factory()->create()->id,
            'city_id' => (string) $city->id,
            'salary_min' => 9000000,
            'salary_max' => 1000,
            'apply_url' => 'javascript:alert(1)',
        ]))
        ->assertSessionHasErrors(['city_id', 'salary_max', 'apply_url']);
});

it('keeps admin edits when the source is crawled again', function () {
    $this->actingAs($this->admin)->put(route('admin.scraper.listings.update', $this->listing), editPayload());
    $origin = $this->listing->origins()->first();
    $run = app(CrawlOrchestrator::class)->queue($this->source, CrawlRunTrigger::Manual);
    Process::fake(['*' => Process::result(output: json_encode([
        'contract_version' => 1, 'run_uuid' => $run->uuid, 'status' => 'succeeded', 'engine_used' => 'api',
        'engines_attempted' => [], 'errors' => [], 'stats' => [], 'company' => null,
        'items' => [[
            'external_id' => $origin->external_id, 'title' => 'Judul dari sumber', 'apply_url' => 'https://contoh.co.id/x',
            'source_url' => $origin->source_url, 'description' => '<p>Isi baru dari sumber</p>', 'location_text' => 'Jakarta, Indonesia',
        ]],
    ]))]);

    app(CrawlOrchestrator::class)->execute($run);

    expect($this->listing->refresh()->title)->toBe('Staf Gudang Senior')
        ->and($this->listing->last_seen_at->isToday())->toBeTrue();
});

it('applies edits to the job already published from the listing', function () {
    $this->listing->update(['job_category_id' => JobCategory::factory()->create()->id]);
    $this->actingAs($this->admin)->postJson(route('admin.scraper.listings.publish'), [
        'listing_ids' => [$this->listing->id], 'employment_type' => 'full_time', 'work_arrangement' => 'onsite', 'experience_level' => 'mid',
    ]);

    $this->actingAs($this->admin)->put(route('admin.scraper.listings.update', $this->listing), editPayload());

    $job = Job::query()->sole();
    expect($job->title)->toBe('Staf Gudang Senior')
        ->and($job->employment_type)->toBe(EmploymentType::Contract)
        ->and($job->external_apply_url)->toBe('https://contoh.co.id/lamar')
        ->and($job->salary_min)->toBe(5000000);
});

it('deletes a listing and its origins', function () {
    $this->actingAs($this->admin)
        ->delete(route('admin.scraper.listings.destroy', $this->listing))
        ->assertRedirect(route('admin.scraper.listings.index'))
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    expect(ScrapedJobListing::query()->find($this->listing->id))->toBeNull()
        ->and(ScrapedJobOrigin::query()->where('scraped_job_listing_id', $this->listing->id)->exists())->toBeFalse()
        ->and(AuditLog::query()->where('action', 'scraped_listing.delete')->exists())->toBeTrue();
});

it('deletes a published listing with its portal job while nobody has applied', function () {
    $this->listing->update(['job_category_id' => JobCategory::factory()->create()->id]);
    $this->actingAs($this->admin)->postJson(route('admin.scraper.listings.publish'), [
        'listing_ids' => [$this->listing->id], 'employment_type' => 'full_time', 'work_arrangement' => 'onsite', 'experience_level' => 'mid',
    ]);
    $job = Job::query()->where('scraped_job_listing_id', $this->listing->id)->sole();

    $this->actingAs($this->admin)
        ->delete(route('admin.scraper.listings.destroy', $this->listing))
        ->assertRedirect(route('admin.scraper.listings.index'));

    expect($this->listing->fresh())->toBeNull()
        ->and(Job::query()->find($job->id))->toBeNull()
        ->and(Job::withTrashed()->find($job->id)->scraped_job_listing_id)->toBeNull();
});

it('refuses to delete a published listing that already has applicants', function () {
    $this->listing->update(['job_category_id' => JobCategory::factory()->create()->id]);
    $this->actingAs($this->admin)->postJson(route('admin.scraper.listings.publish'), [
        'listing_ids' => [$this->listing->id], 'employment_type' => 'full_time', 'work_arrangement' => 'onsite', 'experience_level' => 'mid',
    ]);
    $job = Job::query()->where('scraped_job_listing_id', $this->listing->id)->sole();
    Application::factory()->create(['job_id' => $job->id]);

    $this->actingAs($this->admin)
        ->delete(route('admin.scraper.listings.destroy', $this->listing))
        ->assertSessionHas('inertia.flash_data.toast.type', 'error');

    expect($this->listing->fresh())->not->toBeNull()
        ->and($job->fresh())->not->toBeNull();
});

describe('bulk delete', function () {
    it('deletes the checked listings and skips ones with applicants', function () {
        $category = JobCategory::factory()->create()->id;
        $published = ScrapedJobListing::factory()->create(['job_source_id' => $this->source->id, 'job_category_id' => $category]);
        $applied = ScrapedJobListing::factory()->create(['job_source_id' => $this->source->id, 'job_category_id' => $category]);
        $this->actingAs($this->admin)->postJson(route('admin.scraper.listings.publish'), ['listing_ids' => [$published->id, $applied->id]]);
        Application::factory()->create(['job_id' => Job::query()->where('scraped_job_listing_id', $applied->id)->value('id')]);
        $kept = ScrapedJobListing::factory()->create(['job_source_id' => $this->source->id]);

        $this->actingAs($this->admin)
            ->post(route('admin.scraper.listings.bulk-destroy'), ['listing_ids' => [$this->listing->id, $published->id, $applied->id]])
            ->assertRedirect(route('admin.scraper.listings.index'))
            ->assertSessionHas('inertia.flash_data.toast.message', '2 lowongan dihapus; 1 dilewati karena sudah dilamar kandidat. Scrap ulang untuk mengambil yang terbaru.');

        expect(ScrapedJobListing::query()->pluck('id')->sort()->values()->all())->toBe([$applied->id, $kept->id])
            ->and(Job::query()->where('title', $published->title)->whereNull('scraped_job_listing_id')->exists())->toBeFalse()
            ->and(ScrapedJobOrigin::query()->where('scraped_job_listing_id', $this->listing->id)->exists())->toBeFalse()
            ->and(AuditLog::query()->where('action', 'scraped_listing.bulk_delete')->exists())->toBeTrue();
    });

    it('deletes everything the filters match', function () {
        $match = ScrapedJobListing::factory()->create(['job_source_id' => $this->source->id, 'title' => 'Staf Gudang Malam']);
        $other = ScrapedJobListing::factory()->create(['job_source_id' => $this->source->id, 'title' => 'Akuntan']);

        $this->actingAs($this->admin)
            ->post(route('admin.scraper.listings.bulk-destroy'), ['all_matching' => true, 'filters' => ['search' => 'gudang']])
            ->assertSessionHas('inertia.flash_data.toast.type', 'success');

        expect(ScrapedJobListing::query()->pluck('id')->all())->toBe([$other->id])
            ->and(ScrapedJobListing::query()->find($match->id))->toBeNull();
    });

    it('shows how many listings can be deleted', function () {
        $this->actingAs($this->admin)
            ->get(route('admin.scraper.listings.index'))
            ->assertInertia(fn (Assert $page) => $page->where('deletableCount', 1));
    });

    it('is admin only', function () {
        $this->actingAs(User::factory()->employer()->create())
            ->post(route('admin.scraper.listings.bulk-destroy'), ['listing_ids' => [$this->listing->id]])
            ->assertForbidden();

        expect($this->listing->fresh())->not->toBeNull();
    });
});

it('is admin only', function () {
    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)->get(route('admin.scraper.listings.edit', $this->listing))->assertForbidden();
    $this->actingAs($employer)->put(route('admin.scraper.listings.update', $this->listing), editPayload())->assertForbidden();
    $this->actingAs($employer)->delete(route('admin.scraper.listings.destroy', $this->listing))->assertForbidden();
});
