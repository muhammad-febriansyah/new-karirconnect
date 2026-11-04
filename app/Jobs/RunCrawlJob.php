<?php

namespace App\Jobs;

use App\Models\CrawlRun;
use App\Services\Crawler\CrawlOrchestrator;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/**
 * Executes one queued crawl run. Never retried by the queue: a failed run
 * stays failed and an admin (or the next schedule) starts a fresh one, so
 * one source cannot pile up attempts against a struggling site.
 */
class RunCrawlJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout;

    public function __construct(public readonly int $crawlRunId)
    {
        // Longer than the worker's own limit so the worker can report it.
        $this->timeout = (int) config('crawler.timeout_seconds') + 90;
    }

    public function handle(CrawlOrchestrator $orchestrator): void
    {
        $run = CrawlRun::query()->find($this->crawlRunId);

        if ($run !== null) {
            $orchestrator->execute($run);
        }
    }

    public function failed(?Throwable $exception): void
    {
        $run = CrawlRun::query()->find($this->crawlRunId);

        if ($run !== null) {
            app(CrawlOrchestrator::class)->failUnexpectedly(
                $run,
                'Job crawl gagal: '.($exception?->getMessage() ?? 'tanpa pesan'),
            );
        }
    }
}
