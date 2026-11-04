<?php

namespace App\Console\Commands\Crawler;

use App\Enums\CrawlRunTrigger;
use App\Exceptions\Crawler\CrawlNotAllowedException;
use App\Models\JobSource;
use App\Services\Crawler\CrawlOrchestrator;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('crawler:dispatch-due')]
#[Description('Queue a crawl for every active job source whose schedule has come round.')]
class DispatchDueCrawls extends Command
{
    public function handle(CrawlOrchestrator $orchestrator): int
    {
        $queued = 0;
        $skipped = 0;

        JobSource::query()->eligible()->orderBy('last_run_at')->each(function (JobSource $source) use ($orchestrator, &$queued, &$skipped): void {
            if (! $source->isDue() || $orchestrator->hasUnfinishedRun($source)) {
                $skipped++;

                return;
            }

            try {
                $orchestrator->queue($source, CrawlRunTrigger::Schedule);
                $queued++;
            } catch (CrawlNotAllowedException $exception) {
                $this->warn($exception->getMessage());
                $skipped++;
            }
        });

        $this->info("Crawl runs queued: {$queued}, skipped: {$skipped}");

        return self::SUCCESS;
    }
}
