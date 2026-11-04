<?php

namespace App\Http\Controllers\Admin\Scraper;

use App\Enums\CrawlRunStatus;
use App\Exceptions\Crawler\CrawlNotAllowedException;
use App\Http\Controllers\Controller;
use App\Models\CrawlError;
use App\Models\CrawlRun;
use App\Models\JobSource;
use App\Services\Audit\AuditLogService;
use App\Services\Crawler\CrawlOrchestrator;
use App\Services\Crawler\ScraperViewData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CrawlRunController extends Controller
{
    public function __construct(
        private readonly CrawlOrchestrator $orchestrator,
        private readonly AuditLogService $audit,
    ) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', JobSource::class);

        $status = $request->string('status')->toString();
        $sourceId = $request->integer('source');

        $runs = CrawlRun::query()
            ->with(['source' => fn ($query) => $query->withTrashed(), 'triggeredBy:id,name'])
            ->withCount('errors')
            ->when(CrawlRunStatus::tryFrom($status), fn ($query, CrawlRunStatus $value) => $query->where('status', $value))
            ->when($sourceId > 0, fn ($query) => $query->where('job_source_id', $sourceId))
            ->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (CrawlRun $run): array => ScraperViewData::run($run));

        return Inertia::render('admin/scraper/runs/index', [
            'runs' => $runs,
            'filters' => [
                'status' => CrawlRunStatus::tryFrom($status)?->value ?? '',
                'source' => $sourceId > 0 ? (string) $sourceId : '',
            ],
            'statusOptions' => CrawlRunStatus::selectItems(),
            'sourceOptions' => ScraperViewData::sourceOptions(),
            'hasActiveRuns' => CrawlRun::query()->whereIn('status', [CrawlRunStatus::Queued, CrawlRunStatus::Running])->exists(),
        ]);
    }

    public function show(CrawlRun $run): Response
    {
        Gate::authorize('viewAny', JobSource::class);

        $run->load(['source' => fn ($query) => $query->withTrashed(), 'triggeredBy:id,name', 'retryOf:id,uuid']);
        $run->loadCount('errors');

        return Inertia::render('admin/scraper/runs/show', [
            'run' => [
                ...ScraperViewData::run($run),
                'engines_attempted' => $run->engines_attempted ?? [],
                'summary' => $run->summary ?? [],
                'retry_of' => $run->retryOf ? ['id' => $run->retryOf->id, 'uuid' => $run->retryOf->uuid] : null,
                'can_retry' => $run->status->isFinished() && $run->source !== null && ! $run->source->trashed(),
                'can_cancel' => ! $run->status->isFinished() && ! ($run->summary['cancel_requested'] ?? false),
            ],
            'runErrors' => $run->errors()
                ->latest('id')
                ->paginate(25)
                ->withQueryString()
                ->through(fn (CrawlError $error): array => ScraperViewData::error($error)),
        ]);
    }

    public function retry(Request $request, CrawlRun $run): RedirectResponse
    {
        Gate::authorize('viewAny', JobSource::class);

        try {
            $retry = $this->orchestrator->retry($run, $request->user());
        } catch (CrawlNotAllowedException $exception) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $exception->getMessage()]);

            return back();
        }

        $this->audit->record('crawl_run.retry', $run, null, ['crawl_run_id' => $retry->id], $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Crawl ulang masuk antrean.']);

        return to_route('admin.scraper.runs.show', $retry);
    }

    public function cancel(Request $request, CrawlRun $run): RedirectResponse
    {
        Gate::authorize('viewAny', JobSource::class);

        $wasRunning = $run->status === CrawlRunStatus::Running;

        if (! $this->orchestrator->cancel($run)) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Crawl ini sudah selesai, jadi tidak bisa dibatalkan.']);

            return back();
        }

        $this->audit->record('crawl_run.cancel', $run, null, ['was_running' => $wasRunning], $request->user());

        Inertia::flash('toast', $wasRunning
            ? ['type' => 'warning', 'message' => 'Pembatalan dicatat. Worker sedang berjalan; hasilnya akan dibuang begitu selesai.']
            : ['type' => 'success', 'message' => 'Crawl dibatalkan.']);

        return back();
    }
}
