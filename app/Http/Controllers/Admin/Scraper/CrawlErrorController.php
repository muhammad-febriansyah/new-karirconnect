<?php

namespace App\Http\Controllers\Admin\Scraper;

use App\Enums\CrawlErrorCategory;
use App\Http\Controllers\Controller;
use App\Models\CrawlError;
use App\Models\JobSource;
use App\Services\Crawler\ScraperViewData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CrawlErrorController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', JobSource::class);

        $category = $request->string('category')->toString();
        $sourceId = $request->integer('source');
        $runId = $request->integer('run');

        $errors = CrawlError::query()
            ->with(['source' => fn ($query) => $query->withTrashed()])
            ->when(CrawlErrorCategory::tryFrom($category), fn ($query, CrawlErrorCategory $value) => $query->where('category', $value))
            ->when($sourceId > 0, fn ($query) => $query->where('job_source_id', $sourceId))
            ->when($runId > 0, fn ($query) => $query->where('crawl_run_id', $runId))
            ->latest('occurred_at')
            ->latest('id')
            ->paginate(30)
            ->withQueryString()
            ->through(fn (CrawlError $error): array => ScraperViewData::error($error));

        $since = now()->subDays(7);

        return Inertia::render('admin/scraper/logs/index', [
            'logs' => $errors,
            'filters' => [
                'category' => CrawlErrorCategory::tryFrom($category)?->value ?? '',
                'source' => $sourceId > 0 ? (string) $sourceId : '',
                'run' => $runId > 0 ? (string) $runId : '',
            ],
            'categoryOptions' => CrawlErrorCategory::selectItems(),
            'sourceOptions' => ScraperViewData::sourceOptions(),
            'categoryCounts' => CrawlError::query()
                ->where('occurred_at', '>=', $since)
                ->selectRaw('category, count(*) as total')
                ->groupBy('category')
                ->pluck('total', 'category'),
        ]);
    }
}
