<?php

namespace App\Http\Controllers\Admin\Scraper;

use App\Enums\CircuitState;
use App\Enums\CrawlRunTrigger;
use App\Enums\JobSourceStatus;
use App\Enums\JobSourceType;
use App\Exceptions\Crawler\CrawlNotAllowedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\JobSourceRequest;
use App\Models\JobSource;
use App\Services\Audit\AuditLogService;
use App\Services\Crawler\CrawlOrchestrator;
use App\Services\Crawler\ScraperViewData;
use App\Services\Sanitizer\LikeEscaper;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class JobSourceController extends Controller
{
    public function __construct(
        private readonly AuditLogService $audit,
        private readonly CrawlOrchestrator $orchestrator,
    ) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', JobSource::class);

        $status = $request->string('status')->toString();
        $type = $request->string('type')->toString();
        $search = trim($request->string('search')->toString());

        $sources = JobSource::query()
            ->with('latestCrawlRun')
            ->withCount(['listings as listings_active_count' => fn ($query) => $query->where('status', 'active')])
            ->when(JobSourceStatus::tryFrom($status), fn ($query, JobSourceStatus $value) => $query->where('status', $value))
            ->when(JobSourceType::tryFrom($type), fn ($query, JobSourceType $value) => $query->where('type', $value))
            ->when($search !== '', fn ($query) => $query->where(fn ($inner) => $inner
                ->whereRaw(LikeEscaper::sql('name'), [LikeEscaper::contains($search)])
                ->orWhereRaw(LikeEscaper::sql('slug'), [LikeEscaper::contains($search)])
                ->orWhereRaw(LikeEscaper::sql('base_url'), [LikeEscaper::contains($search)])))
            ->orderByRaw('case status when ? then 0 when ? then 1 else 2 end', [JobSourceStatus::Active->value, JobSourceStatus::PendingPermission->value])
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (JobSource $source): array => [
                ...ScraperViewData::sourceRef($source),
                'base_url' => $source->base_url,
                'status' => $source->status->value,
                'status_label' => $source->status->label(),
                'status_tone' => $source->status->color(),
                'circuit_state' => $source->circuit_state->value,
                'circuit_label' => $source->circuit_state->label(),
                'cooldown_until' => $source->isCoolingDown() ? $source->cooldown_until?->toIso8601String() : null,
                'schedule_minutes' => $source->schedule_minutes,
                'last_run_at' => $source->last_run_at?->toIso8601String(),
                'last_success_at' => $source->last_success_at?->toIso8601String(),
                'listings_active_count' => $source->listings_active_count,
                'latest_run' => $source->latestCrawlRun ? ScraperViewData::run($source->latestCrawlRun) : null,
                'can_run' => $source->isRunnable() && ! $source->isCoolingDown(),
            ]);

        return Inertia::render('admin/scraper/sources/index', [
            'sources' => $sources,
            'filters' => [
                'status' => JobSourceStatus::tryFrom($status)?->value ?? '',
                'type' => JobSourceType::tryFrom($type)?->value ?? '',
                'search' => $search,
            ],
            'statusOptions' => JobSourceStatus::selectItems(),
            'typeOptions' => JobSourceType::selectItems(),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', JobSource::class);

        return Inertia::render('admin/scraper/sources/form', [
            'mode' => 'create',
            'source' => null,
            ...$this->formOptions(),
        ]);
    }

    public function store(JobSourceRequest $request): RedirectResponse
    {
        $data = $request->sourceAttributes();
        $data['slug'] = $this->uniqueSlug($data['slug']);

        $source = JobSource::query()->create($data);

        $this->audit->record('job_source.create', $source, null, $this->auditSnapshot($source), $request->user());

        Inertia::flash('toast', $source->status === JobSourceStatus::Active
            ? ['type' => 'success', 'message' => "Sumber \"{$source->name}\" ditambahkan dan akan di-crawl sesuai jadwal."]
            : ['type' => 'warning', 'message' => "Sumber \"{$source->name}\" disimpan sebagai {$source->status->label()}. Aktifkan setelah izinnya jelas."]);

        return to_route('admin.scraper.sources.index');
    }

    public function edit(JobSource $jobSource): Response
    {
        Gate::authorize('update', $jobSource);

        return Inertia::render('admin/scraper/sources/form', [
            'mode' => 'edit',
            'source' => [
                'id' => $jobSource->id,
                'name' => $jobSource->name,
                'slug' => $jobSource->slug,
                'type' => $jobSource->type->value,
                'base_url' => $jobSource->base_url,
                'allowed_domains' => $jobSource->allowed_domains ?? [],
                'config' => (object) ($jobSource->config ?? []),
                'status' => $jobSource->status->value,
                'permission_notes' => $jobSource->permission_notes,
                'robots_checked' => $jobSource->robots_checked_at !== null,
                'robots_checked_at' => $jobSource->robots_checked_at?->toIso8601String(),
                'schedule_minutes' => $jobSource->schedule_minutes,
                'rate_limit_per_minute' => $jobSource->rate_limit_per_minute,
                'max_pages' => $jobSource->max_pages,
                'expected_min_items' => $jobSource->expected_min_items,
                'browser_allowed' => $jobSource->browser_allowed,
                'circuit_state' => $jobSource->circuit_state->value,
                'circuit_label' => $jobSource->circuit_state->label(),
                'consecutive_failures' => $jobSource->consecutive_failures,
                'cooldown_until' => $jobSource->isCoolingDown() ? $jobSource->cooldown_until?->toIso8601String() : null,
            ],
            ...$this->formOptions(),
        ]);
    }

    public function update(JobSourceRequest $request, JobSource $jobSource): RedirectResponse
    {
        $before = $this->auditSnapshot($jobSource);
        $data = $request->sourceAttributes($jobSource);
        if ($data['slug'] !== $jobSource->slug) {
            $data['slug'] = $this->uniqueSlug($data['slug'], $jobSource->id);
        }

        $jobSource->update($data);

        $this->audit->record('job_source.update', $jobSource, $before, $this->auditSnapshot($jobSource), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Sumber \"{$jobSource->name}\" diperbarui."]);

        return to_route('admin.scraper.sources.index');
    }

    public function destroy(Request $request, JobSource $jobSource): RedirectResponse
    {
        Gate::authorize('delete', $jobSource);

        if ($this->orchestrator->hasUnfinishedRun($jobSource)) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Sumber masih punya crawl yang antre atau berjalan. Batalkan dulu crawl tersebut.']);

            return back();
        }

        $snapshot = $this->auditSnapshot($jobSource);
        $jobSource->delete();

        $this->audit->record('job_source.delete', $jobSource, $snapshot, null, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Sumber \"{$jobSource->name}\" dihapus. Lowongan dan riwayat crawl-nya tetap tersimpan."]);

        return to_route('admin.scraper.sources.index');
    }

    /**
     * Start a crawl now, outside the schedule.
     */
    public function run(Request $request, JobSource $jobSource): RedirectResponse
    {
        Gate::authorize('update', $jobSource);

        try {
            $run = $this->orchestrator->queue($jobSource, CrawlRunTrigger::Manual, $request->user());
        } catch (CrawlNotAllowedException $exception) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $exception->getMessage()]);

            return back();
        }

        $this->audit->record('job_source.run', $jobSource, null, ['crawl_run_id' => $run->id], $request->user());

        Inertia::flash('toast', $jobSource->circuit_state === CircuitState::Closed
            ? ['type' => 'success', 'message' => "Crawl \"{$jobSource->name}\" masuk antrean."]
            : ['type' => 'warning', 'message' => "Crawl \"{$jobSource->name}\" masuk antrean sebagai uji coba; sumber ini sebelumnya gagal {$jobSource->consecutive_failures} kali berturut-turut."]);

        return to_route('admin.scraper.runs.show', $run);
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'typeOptions' => collect(JobSourceType::cases())->map(fn (JobSourceType $type): array => [
                'value' => $type->value,
                'label' => $type->label(),
                // Only these can be crawled by the current worker.
                'runnable' => in_array($type, JobSourceRequest::RUNNABLE_TYPES, true),
            ])->all(),
            'statusOptions' => JobSourceStatus::selectItems(),
        ];
    }

    private function uniqueSlug(string $slug, ?int $ignoreId = null): string
    {
        $base = Str::limit($slug, 150, '');
        $candidate = $base;
        $suffix = 2;

        while (JobSource::withTrashed()->where('slug', $candidate)->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))->exists()) {
            $candidate = "{$base}-{$suffix}";
            $suffix++;
        }

        return $candidate;
    }

    /**
     * @return array<string, mixed>
     */
    private function auditSnapshot(JobSource $source): array
    {
        return $source->only(['name', 'slug', 'type', 'base_url', 'allowed_domains', 'config', 'status', 'permission_notes', 'robots_checked_at', 'schedule_minutes', 'rate_limit_per_minute', 'max_pages', 'browser_allowed']);
    }
}
