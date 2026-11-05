<?php

namespace App\Http\Controllers\Admin\Scraper;

use App\Enums\EducationLevel;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\ScrapedJobListingStatus;
use App\Enums\WorkArrangement;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkDeleteScrapedJobListingsRequest;
use App\Http\Requests\Admin\UpdateScrapedJobListingRequest;
use App\Models\City;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\JobSource;
use App\Models\Province;
use App\Models\ScrapedJobListing;
use App\Models\ScrapedJobOrigin;
use App\Services\Audit\AuditLogService;
use App\Services\Crawler\ScraperViewData;
use App\Services\ExternalJobs\ExternalListingFilter;
use App\Services\Sanitizer\HtmlSanitizerService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ScrapedJobListingController extends Controller
{
    public function __construct(
        private readonly AuditLogService $audit,
        private readonly HtmlSanitizerService $sanitizer,
    ) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', JobSource::class);

        $filters = [
            'status' => ScrapedJobListingStatus::tryFrom($request->string('status')->toString())?->value ?? '',
            'source' => $request->integer('source') > 0 ? (string) $request->integer('source') : '',
            'category' => $request->integer('category') > 0 ? (string) $request->integer('category') : '',
            'published' => in_array($request->string('published')->toString(), ['yes', 'no'], true) ? $request->string('published')->toString() : '',
            'search' => trim($request->string('search')->toString()),
            'published_from' => $this->dateFilter($request->string('published_from')->toString()),
            'published_to' => $this->dateFilter($request->string('published_to')->toString()),
        ];

        $listings = ExternalListingFilter::apply(ScrapedJobListing::query(), $filters)
            ->with(['company:id,name,logo_url,logo_path', 'category:id,name', 'city:id,name', 'source' => fn ($query) => $query->withTrashed(), 'publishedJob:id,scraped_job_listing_id,slug,status'])
            ->withCount('origins')
            ->latest('last_seen_at')
            ->latest('id')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (ScrapedJobListing $listing): array => [
                ...ExternalJobController::listingRow($listing),
                'source' => $listing->source ? ScraperViewData::sourceRef($listing->source) : null,
                'origins_count' => $listing->origins_count,
            ]);

        return Inertia::render('admin/scraper/listings/index', [
            'listings' => $listings,
            'filters' => $filters,
            'publishableCount' => ExternalListingFilter::apply(ScrapedJobListing::query(), [...$filters, 'published' => 'no'])
                ->where('status', ScrapedJobListingStatus::Active)
                ->count(),
            // Listings whose portal job has applicants stay.
            'deletableCount' => ExternalListingFilter::apply(ScrapedJobListing::query(), $filters)
                ->whereDoesntHave('publishedJob', fn (Builder $job) => $job->has('applications'))
                ->count(),
            'scrapeSources' => app(ExternalJobController::class)->sourcesForDialog(),
            'statusOptions' => ScrapedJobListingStatus::selectItems(),
            'sourceOptions' => ScraperViewData::sourceOptions(),
            'categoryOptions' => JobCategory::query()->orderBy('name')->get(['id', 'name'])
                ->map(fn (JobCategory $category): array => ['value' => (string) $category->id, 'label' => $category->name]),
        ]);
    }

    public function show(ScrapedJobListing $listing): Response
    {
        Gate::authorize('viewAny', JobSource::class);

        $listing->load([
            'company.industry:id,name',
            'company.companySize:id,name',
            'company.city:id,name',
            'category:id,name',
            'city:id,name',
            'province:id,name',
            'skills:id,name',
            'source' => fn ($query) => $query->withTrashed(),
            'origins.source' => fn ($query) => $query->withTrashed(),
            'publishedJob:id,scraped_job_listing_id,slug,status,published_at',
        ]);
        $company = $listing->company;

        return Inertia::render('admin/scraper/listings/show', [
            'listing' => [
                'id' => $listing->id,
                'title' => $listing->title,
                'status' => $listing->status->value,
                'status_label' => $listing->status->label(),
                'status_tone' => $listing->status->color(),
                'external_id' => $listing->external_id,
                'apply_url' => $listing->apply_url,
                'contact_email' => $listing->contact_email,
                'description' => $listing->description,
                'responsibilities' => $listing->responsibilities,
                'requirements' => $listing->requirements,
                'benefits' => $listing->benefits,
                'employment_type' => $listing->employment_type?->label(),
                'work_arrangement' => $listing->work_arrangement?->label(),
                'experience_level' => $listing->experience_level?->label(),
                'min_education' => $listing->min_education?->label(),
                'salary_min' => $listing->salary_min,
                'salary_max' => $listing->salary_max,
                'salary_currency' => $listing->salary_currency,
                'salary_interval' => $listing->raw_attributes['salary_interval'] ?? null,
                'location_text' => $listing->location_text,
                'city' => $listing->city?->name,
                'province' => $listing->province?->name,
                'category' => $listing->category?->name,
                'skills' => $listing->skills->map(fn ($skill) => ['id' => $skill->id, 'name' => $skill->name, 'is_required' => (bool) $skill->pivot->is_required])->values(),
                'application_deadline' => $listing->application_deadline?->toDateString(),
                'published_at' => $listing->published_at?->toIso8601String(),
                'first_seen_at' => $listing->first_seen_at?->toIso8601String(),
                'last_seen_at' => $listing->last_seen_at?->toIso8601String(),
                'raw_attributes' => $listing->raw_attributes ?? [],
                'source' => $listing->source ? ScraperViewData::sourceRef($listing->source) : null,
                'origins' => $listing->origins->map(fn (ScrapedJobOrigin $origin): array => [
                    'id' => $origin->id,
                    'external_id' => $origin->external_id,
                    'source_url' => $origin->source_url,
                    'source' => $origin->source ? ScraperViewData::sourceRef($origin->source) : null,
                    'first_seen_at' => $origin->first_seen_at?->toIso8601String(),
                    'last_seen_at' => $origin->last_seen_at?->toIso8601String(),
                    'last_crawl_run_id' => $origin->last_crawl_run_id,
                ])->values(),
                'published_job' => $listing->publishedJob ? [
                    'slug' => $listing->publishedJob->slug,
                    'applications_count' => $listing->publishedJob->applications()->count(),
                    'status' => $listing->publishedJob->status?->value,
                    'published_at' => $listing->publishedJob->published_at?->toIso8601String(),
                ] : null,
                'company' => $company ? [
                    'id' => $company->id,
                    'recruitment_email' => $company->recruitment_email,
                    'recruitment_email_source' => $company->recruitment_email_source,
                    'recruitment_email_verified_at' => $company->recruitment_email_verified_at?->toIso8601String(),
                    'contact_checked_at' => $company->contact_checked_at?->toIso8601String(),
                    'name' => $company->name,
                    'tagline' => $company->tagline,
                    'logo_url' => $company->logoUrl(),
                    'logo_stored' => filled($company->logo_path),
                    'website' => $company->website,
                    'email' => $company->email,
                    'phone' => $company->phone,
                    'address' => $company->address,
                    'about' => $company->about,
                    'founded_year' => $company->founded_year,
                    'industry' => $company->industry?->name,
                    'size' => $company->companySize?->name,
                    'city' => $company->city?->name,
                    'profile_source_url' => $company->profile_source_url,
                    'linked_company_id' => $company->company_id,
                ] : null,
            ],
        ]);
    }

    public function edit(ScrapedJobListing $listing): Response
    {
        Gate::authorize('viewAny', JobSource::class);

        $listing->load(['company:id,name', 'publishedJob:id,scraped_job_listing_id,slug,status', 'editedBy:id,name']);

        return Inertia::render('admin/scraper/listings/edit', [
            'listing' => [
                'id' => $listing->id,
                'title' => $listing->title,
                'company' => $listing->company?->name,
                'job_category_id' => $listing->job_category_id ? (string) $listing->job_category_id : '',
                'employment_type' => $listing->employment_type?->value ?? '',
                'work_arrangement' => $listing->work_arrangement?->value ?? '',
                'experience_level' => $listing->experience_level?->value ?? '',
                'min_education' => $listing->min_education?->value ?? '',
                'province_id' => $listing->province_id ? (string) $listing->province_id : '',
                'city_id' => $listing->city_id ? (string) $listing->city_id : '',
                'location_text' => $listing->location_text ?? '',
                'salary_min' => $listing->salary_min,
                'salary_max' => $listing->salary_max,
                'salary_currency' => $listing->salary_currency ?? 'IDR',
                'is_salary_visible' => $listing->is_salary_visible,
                'application_deadline' => $listing->application_deadline?->toDateString(),
                'apply_url' => $listing->apply_url,
                'contact_email' => $listing->contact_email ?? '',
                'description' => $listing->description ?? '',
                'responsibilities' => $listing->responsibilities ?? '',
                'requirements' => $listing->requirements ?? '',
                'benefits' => $listing->benefits ?? '',
                'published_job' => $listing->publishedJob ? ['slug' => $listing->publishedJob->slug, 'status' => $listing->publishedJob->status?->value] : null,
                'edited_at' => $listing->edited_at?->toIso8601String(),
                'edited_by' => $listing->editedBy?->name,
            ],
            'options' => [
                'categories' => JobCategory::query()->orderBy('name')->get(['id', 'name'])
                    ->map(fn (JobCategory $category): array => ['value' => (string) $category->id, 'label' => $category->name]),
                'employmentTypes' => EmploymentType::selectItems(),
                'workArrangements' => WorkArrangement::selectItems(),
                'experienceLevels' => ExperienceLevel::selectItems(),
                'educationLevels' => EducationLevel::selectItems(),
                'provinces' => Province::query()->orderBy('name')->get(['id', 'name'])
                    ->map(fn (Province $province): array => ['value' => (string) $province->id, 'label' => $province->name]),
                'cities' => City::query()->orderBy('name')->get(['id', 'name', 'province_id'])
                    ->map(fn (City $city): array => ['value' => (string) $city->id, 'label' => $city->name, 'province_id' => (string) $city->province_id]),
            ],
        ]);
    }

    /**
     * Save an admin's corrections. Later crawls keep them (edited_at), and a
     * job already published from this listing gets the same changes.
     */
    public function update(UpdateScrapedJobListingRequest $request, ScrapedJobListing $listing): RedirectResponse
    {
        $data = $request->validated();
        foreach (['description', 'responsibilities', 'requirements', 'benefits'] as $field) {
            $clean = $this->sanitizer->clean($data[$field] ?? null);
            $data[$field] = $clean === '' ? null : $clean;
        }

        $before = $listing->only(array_keys($data));
        $listing->fill([...$data, 'edited_at' => now(), 'edited_by_user_id' => $request->user()->id])->save();

        $job = $listing->publishedJob;
        if ($job !== null) {
            $job->forceFill([
                'title' => $listing->title,
                'job_category_id' => $listing->job_category_id ?? $job->job_category_id,
                'description' => $listing->description,
                'responsibilities' => $listing->responsibilities,
                'requirements' => $listing->requirements,
                'benefits' => $listing->benefits,
                'employment_type' => $listing->employment_type ?? $job->employment_type,
                'work_arrangement' => $listing->work_arrangement ?? $job->work_arrangement,
                'experience_level' => $listing->experience_level ?? $job->experience_level,
                'min_education' => $listing->min_education,
                'salary_min' => $listing->salary_currency === null || $listing->salary_currency === 'IDR' ? $listing->salary_min : null,
                'salary_max' => $listing->salary_currency === null || $listing->salary_currency === 'IDR' ? $listing->salary_max : null,
                'is_salary_visible' => $listing->is_salary_visible,
                'province_id' => $listing->province_id,
                'city_id' => $listing->city_id,
                'application_deadline' => $listing->application_deadline,
                'external_apply_url' => $listing->apply_url,
            ])->save();
        }

        $this->audit->record('scraped_listing.update', $listing, $before, $listing->only(array_keys($data)), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => $job
            ? 'Lowongan diperbarui, termasuk lowongan yang sudah tayang di portal.'
            : 'Lowongan diperbarui. Crawl berikutnya tidak akan menimpa perubahan ini.']);

        return to_route('admin.scraper.listings.show', $listing);
    }

    public function destroy(Request $request, ScrapedJobListing $listing): RedirectResponse
    {
        Gate::authorize('viewAny', JobSource::class);

        $job = $listing->publishedJob;
        if ($job !== null && $job->applications()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Lowongan ini sudah dilamar kandidat, jadi tidak bisa dihapus. Tutup lowongan portalnya dari menu Lowongan.']);

            return back();
        }

        $snapshot = $listing->only(['id', 'title', 'external_id', 'job_source_id']) + ['job_id' => $job?->id];
        DB::transaction(function () use ($listing, $job): void {
            // Published but nobody applied yet: the portal job goes too.
            $job?->delete();
            $listing->delete();
        });

        $this->audit->record('scraped_listing.delete', null, $snapshot, null, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => "\"{$snapshot['title']}\" dihapus. Jika masih ada di sumbernya, crawl berikutnya akan mengambilnya lagi; pakai Sembunyikan agar tidak muncul."]);

        return to_route('admin.scraper.listings.index');
    }

    /**
     * Delete the checked listings, or every listing the filters match, with
     * their portal job when published. Listings whose portal job already has
     * applicants are kept. Deleting also forgets their origins, so the next
     * crawl reads those pages again first and stores them fresh.
     */
    public function bulkDestroy(BulkDeleteScrapedJobListingsRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $query = ($data['all_matching'] ?? false)
            ? ExternalListingFilter::apply(ScrapedJobListing::query(), $data['filters'] ?? [])
            : ScrapedJobListing::query()->whereKey($data['listing_ids']);
        $query->whereDoesntHave('publishedJob', fn (Builder $job) => $job->has('applications'));

        $requested = ($data['all_matching'] ?? false) ? null : count($data['listing_ids']);
        $deleted = 0;
        $query->select('id')->chunkById(500, function ($chunk) use (&$deleted): void {
            $deleted += DB::transaction(function () use ($chunk): int {
                Job::query()->whereIn('scraped_job_listing_id', $chunk->pluck('id'))->delete();

                return ScrapedJobListing::query()->whereKey($chunk->pluck('id'))->delete();
            });
        });

        $this->audit->record('scraped_listing.bulk_delete', null, null, [
            'deleted' => $deleted,
            'all_matching' => (bool) ($data['all_matching'] ?? false),
            'filters' => $data['filters'] ?? [],
        ], $request->user());

        $kept = $requested !== null ? $requested - $deleted : 0;
        Inertia::flash('toast', match (true) {
            $deleted === 0 => ['type' => 'warning', 'message' => 'Tidak ada lowongan yang dihapus. Lowongan yang sudah dilamar kandidat tidak bisa dihapus.'],
            $kept > 0 => ['type' => 'success', 'message' => "{$deleted} lowongan dihapus; {$kept} dilewati karena sudah dilamar kandidat. Scrap ulang untuk mengambil yang terbaru."],
            default => ['type' => 'success', 'message' => "{$deleted} lowongan dihapus. Scrap ulang untuk mengambil yang terbaru."],
        });

        return to_route('admin.scraper.listings.index');
    }

    /**
     * Hide a listing from the scraper results, or bring it back.
     */
    public function toggleVisibility(Request $request, ScrapedJobListing $listing): RedirectResponse
    {
        Gate::authorize('viewAny', JobSource::class);

        $before = $listing->status->value;
        $listing->status = $listing->status === ScrapedJobListingStatus::Hidden
            ? ScrapedJobListingStatus::Active
            : ScrapedJobListingStatus::Hidden;
        $listing->save();

        $this->audit->record('scraped_listing.visibility', $listing, ['status' => $before], ['status' => $listing->status->value], $request->user());

        Inertia::flash('toast', $listing->status === ScrapedJobListingStatus::Hidden
            ? ['type' => 'info', 'message' => 'Lowongan disembunyikan. Crawl berikutnya tidak akan menampilkannya lagi.']
            : ['type' => 'success', 'message' => 'Lowongan ditampilkan kembali.']);

        return back();
    }

    private function dateFilter(string $value): string
    {
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 ? $value : '';
    }
}
