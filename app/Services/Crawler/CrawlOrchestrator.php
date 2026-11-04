<?php

namespace App\Services\Crawler;

use App\Enums\CrawlErrorCategory;
use App\Enums\CrawlRunStatus;
use App\Enums\CrawlRunTrigger;
use App\Exceptions\Crawler\CrawlerWorkerException;
use App\Exceptions\Crawler\CrawlNotAllowedException;
use App\Exceptions\Crawler\UnsafeUrlException;
use App\Jobs\RunCrawlJob;
use App\Models\CrawlError;
use App\Models\CrawlRun;
use App\Models\JobSource;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Owns the life of a crawl run: queue -> run worker -> store -> update the
 * source (cooldown, circuit breaker, schedule).
 */
class CrawlOrchestrator
{
    public function __construct(
        private readonly CrawlerClient $client,
        private readonly ListingIngestor $ingestor,
        private readonly CircuitBreaker $breaker,
        private readonly UrlSafetyGuard $guard,
    ) {}

    /**
     * @throws CrawlNotAllowedException
     */
    public function queue(
        JobSource $source,
        CrawlRunTrigger $trigger,
        ?User $triggeredBy = null,
        ?CrawlRun $retryOf = null,
    ): CrawlRun {
        if (! $source->isRunnable()) {
            throw new CrawlNotAllowedException("Sumber \"{$source->name}\" tidak aktif sehingga tidak bisa di-crawl.");
        }
        if ($source->isCoolingDown()) {
            throw new CrawlNotAllowedException(
                "Sumber \"{$source->name}\" sedang jeda sampai {$source->cooldown_until->translatedFormat('d M Y H:i')}.",
            );
        }
        if ($this->hasUnfinishedRun($source)) {
            throw new CrawlNotAllowedException("Sumber \"{$source->name}\" masih punya crawl yang antre atau berjalan.");
        }

        $run = CrawlRun::query()->create([
            'job_source_id' => $source->id,
            'uuid' => (string) Str::uuid(),
            'status' => CrawlRunStatus::Queued,
            'trigger' => $trigger,
            'triggered_by_user_id' => $triggeredBy?->id,
            'retry_of_crawl_run_id' => $retryOf?->id,
        ]);

        RunCrawlJob::dispatch($run->id)
            ->onConnection((string) config('crawler.connection'))
            ->onQueue((string) config('crawler.queue'));

        return $run;
    }

    /**
     * @throws CrawlNotAllowedException
     */
    public function retry(CrawlRun $run, ?User $triggeredBy = null): CrawlRun
    {
        if (! $run->status->isFinished()) {
            throw new CrawlNotAllowedException('Crawl ini belum selesai, jadi belum bisa diulang.');
        }

        return $this->queue($run->source, CrawlRunTrigger::Retry, $triggeredBy, $run);
    }

    /**
     * A queued run is cancelled at once. A running run is flagged; its result
     * is thrown away when the worker returns.
     */
    public function cancel(CrawlRun $run): bool
    {
        if ($run->status === CrawlRunStatus::Queued) {
            $this->finish($run, CrawlRunStatus::Cancelled, ['reason' => 'cancelled_by_admin']);

            return true;
        }

        if ($run->status === CrawlRunStatus::Running) {
            Cache::put($this->cancelKey($run), true, now()->addHours(2));
            $run->forceFill(['summary' => [...($run->summary ?? []), 'cancel_requested' => true]])->save();

            return true;
        }

        return false;
    }

    public function hasUnfinishedRun(JobSource $source): bool
    {
        return $source->crawlRuns()
            ->whereIn('status', [CrawlRunStatus::Queued, CrawlRunStatus::Running])
            ->exists();
    }

    public function execute(CrawlRun $run): void
    {
        $run->refresh();
        if ($run->status !== CrawlRunStatus::Queued) {
            return;
        }

        $source = $run->source;
        if ($source === null || ! $source->isRunnable()) {
            $this->finish($run, CrawlRunStatus::Cancelled, ['reason' => 'source_not_runnable']);

            return;
        }

        $lock = Cache::lock("crawler:source:{$source->id}", (int) config('crawler.timeout_seconds') + 120);
        if (! $lock->get()) {
            $this->finish($run, CrawlRunStatus::Cancelled, ['reason' => 'source_already_running']);

            return;
        }

        try {
            $this->runLocked($run, $source);
        } finally {
            $lock->release();
            Cache::forget($this->cancelKey($run));
        }
    }

    /**
     * Mark a run that died outside the normal flow (job crash) as failed.
     */
    public function failUnexpectedly(CrawlRun $run, string $message): void
    {
        $run->refresh();
        if ($run->status->isFinished()) {
            return;
        }

        $this->recordError($run, null, CrawlErrorCategory::Unknown, $message);
        $this->finish($run, CrawlRunStatus::Failed, ['reason' => 'job_failed']);
        $this->settleSource($run->source, CrawlRunStatus::Failed, []);
    }

    private function runLocked(CrawlRun $run, JobSource $source): void
    {
        $this->breaker->beforeRun($source);
        $source->last_run_at = now();
        $source->save();

        $run->forceFill(['status' => CrawlRunStatus::Running, 'started_at' => now()])->save();

        try {
            $this->guard->check($source->base_url, $source->allowed_domains ?? []);
            $response = $this->client->run($this->client->buildRequest($source, $run));
        } catch (UnsafeUrlException $exception) {
            $this->recordError($run, null, CrawlErrorCategory::SsrfBlocked, $exception->getMessage(), url: $source->base_url);
            $this->finishAndSettle($run, $source, CrawlRunStatus::Failed, []);

            return;
        } catch (CrawlerWorkerException $exception) {
            $category = CrawlErrorCategory::tryFrom($exception->category) ?? CrawlErrorCategory::Unknown;
            $this->recordError($run, null, $category, $exception->getMessage());
            $this->finishAndSettle($run, $source, CrawlRunStatus::Failed, []);

            return;
        }

        if (Cache::pull($this->cancelKey($run))) {
            $this->finish($run, CrawlRunStatus::Cancelled, ['reason' => 'cancelled_by_admin']);

            return;
        }

        $status = CrawlRunStatus::tryFrom((string) ($response['status'] ?? '')) ?? CrawlRunStatus::Failed;
        if (! $status->isFinished() || $status === CrawlRunStatus::Cancelled) {
            $status = CrawlRunStatus::Failed;
        }

        $errors = array_values(array_filter($response['errors'] ?? [], 'is_array'));
        $items = array_values(array_filter($response['items'] ?? [], 'is_array'));
        $company = is_array($response['company'] ?? null) ? $response['company'] : null;

        $counts = $this->ingestor->ingest($source, $run, $items, $company);

        foreach ($counts['rejected'] as $rejected) {
            $errors[] = [
                'engine' => $response['engine_used'] ?? null,
                'category' => CrawlErrorCategory::ValidationError->value,
                'message' => implode('; ', $rejected['problems']),
                'url' => $rejected['url'],
                'context' => ['external_id' => $rejected['external_id'], 'checked_by' => 'laravel'],
            ];
        }

        $workerRejected = (int) Arr::get($response, 'stats.rejected', 0);
        $accepted = count($items) - count($counts['rejected']) - $counts['filtered'];

        if ($status === CrawlRunStatus::Succeeded && $this->droppedAbnormally($source, $run, $accepted)) {
            $status = CrawlRunStatus::SuspectedPartial;
        }

        $run->forceFill([
            'engine_used' => $response['engine_used'] ?? null,
            'engines_attempted' => $response['engines_attempted'] ?? [],
            'items_found' => count($items) + $workerRejected,
            'items_created' => $counts['created'],
            'items_updated' => $counts['updated'],
            'items_unchanged' => $counts['unchanged'],
            'items_rejected' => count($counts['rejected']) + $workerRejected,
        ]);

        $this->storeErrors($run, $errors);

        $marked = 0;
        // Only a complete run may say a listing disappeared.
        if ($status === CrawlRunStatus::Succeeded) {
            $marked = $this->ingestor->markUnseen($source, $run);
        }

        $this->finishAndSettle($run, $source, $status, $errors, [
            'company' => $company['name'] ?? null,
            'stats' => $response['stats'] ?? [],
            // Postings outside Indonesia, dropped by the Indonesia-only rule.
            'filtered_outside_indonesia' => $counts['filtered'],
            'listings_marked_unseen' => $marked,
        ]);
    }

    /**
     * True when this run found far fewer items than recent complete runs.
     */
    private function droppedAbnormally(JobSource $source, CrawlRun $run, int $accepted): bool
    {
        $history = $source->crawlRuns()
            ->whereKeyNot($run->id)
            ->where('status', CrawlRunStatus::Succeeded)
            ->latest('id')
            ->limit((int) config('crawler.partial_history_runs'))
            ->pluck('items_found')
            ->sort()
            ->values();

        if ($history->count() < 2) {
            return false;
        }

        $median = (float) $history->median();

        return $median >= (int) config('crawler.partial_min_median')
            && $accepted < $median * (float) config('crawler.partial_drop_ratio');
    }

    /**
     * @param  list<array<string, mixed>>  $errors
     * @param  array<string, mixed>  $summary
     */
    private function finishAndSettle(CrawlRun $run, JobSource $source, CrawlRunStatus $status, array $errors, array $summary = []): void
    {
        $this->finish($run, $status, $summary);
        $this->settleSource($source, $status, $errors);
    }

    /**
     * @param  array<string, mixed>  $summary
     */
    private function finish(CrawlRun $run, CrawlRunStatus $status, array $summary = []): void
    {
        $finishedAt = now();

        $run->forceFill([
            'status' => $status,
            'finished_at' => $finishedAt,
            'duration_ms' => $run->started_at ? (int) $run->started_at->diffInMilliseconds($finishedAt) : null,
            'summary' => [...($run->summary ?? []), ...$summary],
        ])->save();
    }

    /**
     * Cooldown, circuit breaker and success time after a run.
     *
     * @param  list<array<string, mixed>>  $errors
     */
    private function settleSource(?JobSource $source, CrawlRunStatus $status, array $errors): void
    {
        if ($source === null) {
            return;
        }

        $this->breaker->afterRun($source, $status);

        if (in_array($status, [CrawlRunStatus::Succeeded, CrawlRunStatus::Partial, CrawlRunStatus::SuspectedPartial], true)) {
            $source->last_success_at = now();
        }

        $cooldownMinutes = 0;
        if ($status === CrawlRunStatus::AccessRestricted) {
            $cooldownMinutes = (int) config('crawler.access_restricted_cooldown_minutes');
        }

        $retryAfter = collect($errors)
            ->filter(fn (array $error): bool => ($error['category'] ?? null) === CrawlErrorCategory::RateLimited->value)
            ->max(fn (array $error): int => (int) ($error['retry_after_s'] ?? 0));
        if ($retryAfter) {
            $cooldownMinutes = max(
                $cooldownMinutes,
                min((int) ceil($retryAfter / 60), (int) config('crawler.max_rate_limit_cooldown_minutes')),
            );
        }

        if ($cooldownMinutes > 0) {
            $source->cooldown_until = now()->addMinutes($cooldownMinutes);
        }

        $source->save();
    }

    /**
     * @param  list<array<string, mixed>>  $errors
     */
    private function storeErrors(CrawlRun $run, array $errors): void
    {
        $max = (int) config('crawler.max_errors_per_run');

        foreach (array_slice($errors, 0, $max) as $error) {
            $this->recordError(
                $run,
                is_string($error['engine'] ?? null) ? $error['engine'] : null,
                CrawlErrorCategory::tryFrom((string) ($error['category'] ?? '')) ?? CrawlErrorCategory::Unknown,
                is_string($error['message'] ?? null) ? $error['message'] : 'Tanpa pesan',
                httpStatus: is_int($error['http_status'] ?? null) ? $error['http_status'] : null,
                url: is_string($error['url'] ?? null) ? $error['url'] : null,
                retryable: (bool) ($error['retryable'] ?? false),
                context: array_filter([
                    ...(is_array($error['context'] ?? null) ? $error['context'] : []),
                    'retry_after_s' => $error['retry_after_s'] ?? null,
                ], fn (mixed $value): bool => $value !== null),
            );
        }

        if (count($errors) > $max) {
            $run->summary = [...($run->summary ?? []), 'errors_not_stored' => count($errors) - $max];
        }
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function recordError(
        CrawlRun $run,
        ?string $engine,
        CrawlErrorCategory $category,
        string $message,
        ?int $httpStatus = null,
        ?string $url = null,
        bool $retryable = false,
        array $context = [],
    ): void {
        CrawlError::query()->create([
            'crawl_run_id' => $run->id,
            'job_source_id' => $run->job_source_id,
            'engine' => $engine ? Str::limit($engine, 32, '') : null,
            'category' => $category,
            'http_status' => $httpStatus,
            'url' => $url ? Str::limit($url, 2048, '') : null,
            'message' => Str::limit($message, 2000),
            'retryable' => $retryable,
            'context' => $context ?: null,
            'occurred_at' => now(),
        ]);
    }

    private function cancelKey(CrawlRun $run): string
    {
        return "crawler:cancel:{$run->id}";
    }
}
