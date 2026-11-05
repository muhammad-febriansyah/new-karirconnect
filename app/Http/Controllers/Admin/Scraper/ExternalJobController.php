<?php

namespace App\Http\Controllers\Admin\Scraper;

use App\Enums\CrawlRunStatus;
use App\Enums\CrawlRunTrigger;
use App\Exceptions\Crawler\CrawlNotAllowedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PublishExternalJobsRequest;
use App\Jobs\FindCompanyContactJob;
use App\Models\CrawlRun;
use App\Models\JobSource;
use App\Models\ScrapedCompany;
use App\Models\ScrapedJobListing;
use App\Services\Audit\AuditLogService;
use App\Services\Crawler\CrawlOrchestrator;
use App\Services\Crawler\ScraperViewData;
use App\Services\ExternalJobs\ExternalJobPublisher;
use App\Services\ExternalJobs\ExternalListingFilter;
use App\Services\ExternalJobs\ExternalSourceCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * JSON endpoints behind the "Scrap" dialog of Jobs Eksternal, plus publish.
 */
class ExternalJobController extends Controller
{
    private const RESULT_LIMIT = 500;

    public function __construct(
        private readonly CrawlOrchestrator $orchestrator,
        private readonly ExternalJobPublisher $publisher,
        private readonly AuditLogService $audit,
        private readonly ExternalSourceCatalog $catalog,
    ) {}

    /**
     * Queue a crawl for each chosen catalog entry, pasted URL or saved source.
     * Sources for catalog entries and URLs are created on the fly.
     */
    public function scrape(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', JobSource::class);

        $data = $request->validate([
            'catalog' => ['array', 'max:20'],
            'catalog.*' => ['string', 'distinct', Rule::in(array_keys($this->catalog->entries()))],
            'urls' => ['array', 'max:5'],
            'urls.*' => ['string', 'distinct', 'max:2048', 'url:https'],
            'source_ids' => ['array', 'max:20'],
            'source_ids.*' => ['integer', 'distinct', 'exists:job_sources,id'],
            'published_from' => ['nullable', 'date_format:Y-m-d'],
            'published_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:published_from'],
        ], [
            'published_to.after_or_equal' => 'Tanggal akhir harus sama atau setelah tanggal mulai.',
            'urls.*.url' => 'URL harus diawali https:// dan valid.',
        ]);

        $targets = [];
        $skipped = [];

        foreach ($data['catalog'] ?? [] as $key) {
            $targets[] = fn (): JobSource => $this->catalog->sourceForEntry($key);
        }
        foreach ($data['urls'] ?? [] as $url) {
            $targets[] = fn (): JobSource => $this->catalog->sourceForUrl($url, $request->user());
        }
        foreach (JobSource::query()->whereKey($data['source_ids'] ?? [])->get() as $saved) {
            $targets[] = fn (): JobSource => $saved;
        }

        if ($targets === []) {
            throw ValidationException::withMessages(['catalog' => 'Pilih sumber dari katalog atau tempel minimal satu URL.']);
        }

        $runs = [];
        foreach ($targets as $resolve) {
            $source = null;
            try {
                $source = $resolve();
                $run = $this->orchestrator->queue($source, CrawlRunTrigger::Manual, $request->user(), dateRange: [
                    'from' => $data['published_from'] ?? null,
                    'to' => $data['published_to'] ?? null,
                ]);
                $runs[] = ['id' => $run->id, 'source' => $source->name];
            } catch (CrawlNotAllowedException $exception) {
                // An unfinished run of this source is followed instead of a new one.
                $active = $source?->crawlRuns()->whereIn('status', [CrawlRunStatus::Queued, CrawlRunStatus::Running])->latest('id')->first();
                if ($active !== null) {
                    $runs[] = ['id' => $active->id, 'source' => $source->name];
                } else {
                    $skipped[] = ['source' => $source?->name ?? 'URL', 'reason' => $exception->getMessage()];
                }
            }
        }

        $this->audit->record('external_jobs.scrape', null, null, [
            'runs' => array_column($runs, 'id'),
            'urls' => $data['urls'] ?? [],
            'published_from' => $data['published_from'] ?? null,
            'published_to' => $data['published_to'] ?? null,
        ], $request->user());

        return response()->json(['runs' => $runs, 'skipped' => $skipped]);
    }

    /**
     * The catalog with each entry's last crawl, plus sources added by URL.
     *
     * @return array{catalog: list<array<string, mixed>>, saved: list<array<string, mixed>>}
     */
    public function sourcesForDialog(): array
    {
        $existing = JobSource::query()->with('latestCrawlRun')->get()->keyBy('slug');

        $catalog = collect($this->catalog->entries())->reject(fn (array $entry): bool => (bool) ($entry['hidden'] ?? false))->map(function (array $entry, string $key) use ($existing): array {
            $source = $existing->get(ExternalSourceCatalog::CATALOG_PREFIX.$key);

            return [
                'key' => $key,
                'name' => $entry['name'],
                'group' => $entry['group'],
                'description' => $entry['description'],
                'warning' => $entry['warning'] ?? null,
                'attribution' => $entry['config']['rules']['attribution']['name'] ?? null,
                'default_selected' => (bool) ($entry['default_selected'] ?? false),
                'cooldown_until' => $source?->isCoolingDown() ? $source->cooldown_until?->toIso8601String() : null,
                'last_run' => $source?->latestCrawlRun ? [
                    'status_label' => $source->latestCrawlRun->status->label(),
                    'status_tone' => $source->latestCrawlRun->status->color(),
                    'created_at' => $source->latestCrawlRun->created_at?->toIso8601String(),
                ] : null,
            ];
        })->values()->all();

        $saved = $existing
            ->filter(fn (JobSource $source): bool => str_starts_with($source->slug, ExternalSourceCatalog::URL_PREFIX) && $source->isRunnable())
            ->map(fn (JobSource $source): array => [
                ...ScraperViewData::sourceRef($source),
                'base_url' => $source->base_url,
                'can_run' => ! $source->isCoolingDown(),
                'cooldown_until' => $source->isCoolingDown() ? $source->cooldown_until?->toIso8601String() : null,
            ])
            ->values()
            ->all();

        return ['catalog' => $catalog, 'saved' => $saved];
    }

    public function status(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', JobSource::class);

        $runs = CrawlRun::query()
            ->with(['source' => fn ($query) => $query->withTrashed()])
            ->withCount('errors')
            ->whereKey($this->runIds($request))
            ->get()
            ->map(fn (CrawlRun $run): array => ScraperViewData::run($run))
            ->values();

        return response()->json([
            'runs' => $runs,
            'finished' => $runs->isNotEmpty() && $runs->every(fn (array $run): bool => $run['is_finished']),
        ]);
    }

    /**
     * Listings seen by the given runs, newest first.
     */
    public function results(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', JobSource::class);

        $runIds = $this->runIds($request);
        $startedAt = CrawlRun::query()->whereKey($runIds)->min('started_at');

        $query = ExternalListingFilter::apply(ScrapedJobListing::query(), ['runs' => $runIds])
            ->with(['company:id,name,logo_url,logo_path', 'category:id,name', 'city:id,name', 'publishedJob:id,scraped_job_listing_id,slug,status'])
            ->latest('first_seen_at')
            ->latest('id');

        $total = (clone $query)->count();

        return response()->json([
            'total' => $total,
            'truncated' => $total > self::RESULT_LIMIT,
            'listings' => $query->limit(self::RESULT_LIMIT)->get()
                ->map(fn (ScrapedJobListing $listing): array => [
                    ...self::listingRow($listing),
                    'is_new' => $startedAt !== null && $listing->first_seen_at?->gte($startedAt),
                ])
                ->values(),
        ]);
    }

    public function publish(PublishExternalJobsRequest $request): JsonResponse|RedirectResponse
    {
        $data = $request->validated();

        $query = ScrapedJobListing::query()->with(['company', 'skills', 'publishedJob']);
        $listings = ($data['all_matching'] ?? false)
            ? ExternalListingFilter::apply($query, [...($data['filters'] ?? []), 'published' => 'no'])
                ->limit(PublishExternalJobsRequest::MAX_PER_REQUEST)->get()
            : $query->whereKey($data['listing_ids'])->get();

        $result = $this->publisher->publish($listings, $request->user(), [
            'job_category_id' => $data['job_category_id'] ?? null,
            'employment_type' => $data['employment_type'] ?? null,
            'work_arrangement' => $data['work_arrangement'] ?? null,
            'experience_level' => $data['experience_level'] ?? null,
        ]);

        $published = count($result['published']);
        $skipped = count($result['skipped']);
        $message = match (true) {
            $published === 0 && $skipped === 0 => 'Tidak ada lowongan yang bisa dipublish.',
            $skipped === 0 => "{$published} lowongan dipublish ke portal.",
            $published === 0 => "Tidak ada yang dipublish; {$skipped} lowongan dilewati.",
            default => "{$published} lowongan dipublish; {$skipped} dilewati.",
        };
        $type = $published > 0 && $skipped === 0 ? 'success' : ($published > 0 ? 'warning' : 'error');

        if ($request->expectsJson()) {
            return response()->json(['type' => $type, 'message' => $message, ...$result]);
        }

        Inertia::flash('toast', ['type' => $type, 'message' => $message]);

        return back();
    }

    /**
     * Set where applications for this company's external jobs are forwarded.
     */
    public function updateRecruitmentEmail(Request $request, ScrapedCompany $company): RedirectResponse
    {
        Gate::authorize('viewAny', JobSource::class);

        $data = $request->validate(['recruitment_email' => ['nullable', 'email:rfc', 'max:191']]);
        $before = $company->recruitment_email;

        $company->forceFill([
            'recruitment_email' => $data['recruitment_email'] ?: null,
            // Entered by hand: no longer an automatically found address.
            'recruitment_email_source' => null,
            'recruitment_email_verified_at' => null,
        ])->save();

        $this->audit->record('scraped_company.recruitment_email', $company, ['recruitment_email' => $before], ['recruitment_email' => $company->recruitment_email], $request->user());

        Inertia::flash('toast', $company->recruitment_email
            ? ['type' => 'success', 'message' => "Lamaran untuk {$company->name} akan diteruskan ke {$company->recruitment_email}."]
            : ['type' => 'info', 'message' => "Email rekrutmen {$company->name} dihapus. Kandidat akan diarahkan ke situs perusahaan."]);

        return back();
    }

    /**
     * Search the company's own website for its recruitment email now.
     */
    public function findRecruitmentEmail(Request $request, ScrapedCompany $company): RedirectResponse
    {
        Gate::authorize('viewAny', JobSource::class);

        FindCompanyContactJob::dispatch($company->id, force: true)
            ->onConnection((string) config('crawler.connection'))
            ->onQueue((string) config('crawler.contact_queue'));

        $this->audit->record('scraped_company.find_contact', $company, null, null, $request->user());
        Inertia::flash('toast', ['type' => 'info', 'message' => filled($company->website)
            ? "Mencari email rekrutmen di {$company->website}. Muat ulang halaman ini sekitar satu menit lagi."
            : "Mencari situs resmi {$company->name} lalu email rekrutmennya. Muat ulang halaman ini sekitar satu menit lagi."]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    public static function listingRow(ScrapedJobListing $listing): array
    {
        return [
            'id' => $listing->id,
            'title' => $listing->title,
            'status' => $listing->status->value,
            'status_label' => $listing->status->label(),
            'status_tone' => $listing->status->color(),
            'location' => $listing->city?->name ?? $listing->location_text,
            'employment_type' => $listing->employment_type?->label(),
            'work_arrangement' => $listing->work_arrangement?->label(),
            'category' => $listing->category?->name,
            'company' => $listing->company ? [
                'name' => $listing->company->name,
                'logo_url' => $listing->company->logoUrl(),
            ] : null,
            'published_job' => $listing->publishedJob ? [
                'slug' => $listing->publishedJob->slug,
                'status' => $listing->publishedJob->status?->value,
            ] : null,
            'published_at' => $listing->published_at?->toIso8601String(),
            'last_seen_at' => $listing->last_seen_at?->toIso8601String(),
        ];
    }

    /**
     * @return list<int>
     */
    private function runIds(Request $request): array
    {
        $ids = $request->input('runs', []);
        $ids = is_string($ids) ? explode(',', $ids) : (array) $ids;

        return array_slice(array_values(array_filter(array_map('intval', $ids))), 0, 50);
    }
}
