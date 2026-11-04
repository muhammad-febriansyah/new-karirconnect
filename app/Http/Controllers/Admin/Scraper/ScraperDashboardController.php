<?php

namespace App\Http\Controllers\Admin\Scraper;

use App\Enums\CircuitState;
use App\Enums\CrawlRunStatus;
use App\Enums\JobSourceStatus;
use App\Enums\ScrapedJobListingStatus;
use App\Http\Controllers\Controller;
use App\Models\CrawlError;
use App\Models\CrawlRun;
use App\Models\JobSource;
use App\Models\ScrapedCompany;
use App\Models\ScrapedJobListing;
use App\Services\Crawler\ScraperViewData;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ScraperDashboardController extends Controller
{
    private const CHART_DAYS = 14;

    public function index(): Response
    {
        Gate::authorize('viewAny', JobSource::class);

        $sourceCounts = JobSource::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $listingCounts = ScrapedJobListing::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $dayAgo = now()->subDay();

        return Inertia::render('admin/scraper/dashboard', [
            'stats' => [
                'sources_active' => (int) ($sourceCounts[JobSourceStatus::Active->value] ?? 0),
                'sources_pending' => (int) ($sourceCounts[JobSourceStatus::PendingPermission->value] ?? 0),
                'sources_disabled' => (int) ($sourceCounts[JobSourceStatus::Disabled->value] ?? 0),
                'listings_active' => (int) ($listingCounts[ScrapedJobListingStatus::Active->value] ?? 0),
                'listings_stale' => (int) ($listingCounts[ScrapedJobListingStatus::Stale->value] ?? 0),
                'listings_total' => (int) $listingCounts->sum(),
                'companies' => ScrapedCompany::query()->count(),
                'companies_with_logo' => ScrapedCompany::query()->whereNotNull('logo_path')->count(),
                'runs_24h' => CrawlRun::query()->where('created_at', '>=', $dayAgo)->count(),
                'runs_failed_24h' => CrawlRun::query()->where('created_at', '>=', $dayAgo)
                    ->whereIn('status', [CrawlRunStatus::Failed, CrawlRunStatus::AccessRestricted])->count(),
                'runs_active' => CrawlRun::query()->whereIn('status', [CrawlRunStatus::Queued, CrawlRunStatus::Running])->count(),
                'errors_24h' => CrawlError::query()->where('occurred_at', '>=', $dayAgo)->count(),
            ],
            'recentRuns' => CrawlRun::query()
                ->with(['source' => fn ($query) => $query->withTrashed()])
                ->withCount('errors')
                ->latest('id')
                ->limit(8)
                ->get()
                ->map(fn (CrawlRun $run): array => ScraperViewData::run($run)),
            'attention' => Inertia::defer(fn (): array => $this->sourcesNeedingAttention()),
            'activity' => Inertia::defer(fn (): array => $this->activityChart()),
        ]);
    }

    /**
     * Active sources that are cooling down, have an open circuit, or whose
     * last run did not succeed.
     *
     * @return list<array<string, mixed>>
     */
    private function sourcesNeedingAttention(): array
    {
        return JobSource::query()
            ->active()
            ->with('latestCrawlRun')
            ->get()
            ->filter(fn (JobSource $source): bool => $source->isCoolingDown()
                || $source->circuit_state !== CircuitState::Closed
                || ($source->latestCrawlRun !== null && $source->latestCrawlRun->status !== CrawlRunStatus::Succeeded && $source->latestCrawlRun->status->isFinished()))
            ->map(fn (JobSource $source): array => [
                ...ScraperViewData::sourceRef($source),
                'circuit_state' => $source->circuit_state->value,
                'circuit_label' => $source->circuit_state->label(),
                'cooldown_until' => $source->isCoolingDown() ? $source->cooldown_until?->toIso8601String() : null,
                'consecutive_failures' => $source->consecutive_failures,
                'last_run' => $source->latestCrawlRun ? ScraperViewData::run($source->latestCrawlRun) : null,
            ])
            ->values()
            ->all();
    }

    /**
     * Runs per day for the last two weeks, split into outcome groups.
     *
     * @return array{days: list<string>, succeeded: list<int>, partial: list<int>, failed: list<int>, items: list<int>}
     */
    private function activityChart(): array
    {
        $start = now()->subDays(self::CHART_DAYS - 1)->startOfDay();

        $runs = CrawlRun::query()
            ->where('created_at', '>=', $start)
            ->get(['status', 'created_at', 'items_found'])
            ->groupBy(fn (CrawlRun $run): string => $run->created_at->toDateString());

        $chart = ['days' => [], 'succeeded' => [], 'partial' => [], 'failed' => [], 'items' => []];

        foreach (range(0, self::CHART_DAYS - 1) as $offset) {
            $day = Carbon::parse($start)->addDays($offset);
            $dayRuns = $runs->get($day->toDateString(), collect());

            $chart['days'][] = $day->translatedFormat('d M');
            $chart['succeeded'][] = $dayRuns->where('status', CrawlRunStatus::Succeeded)->count();
            $chart['partial'][] = $dayRuns->whereIn('status', [CrawlRunStatus::Partial, CrawlRunStatus::SuspectedPartial])->count();
            $chart['failed'][] = $dayRuns->whereIn('status', [CrawlRunStatus::Failed, CrawlRunStatus::AccessRestricted])->count();
            $chart['items'][] = (int) $dayRuns->sum('items_found');
        }

        return $chart;
    }
}
