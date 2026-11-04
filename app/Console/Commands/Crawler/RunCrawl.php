<?php

namespace App\Console\Commands\Crawler;

use App\Enums\CrawlRunTrigger;
use App\Exceptions\Crawler\CrawlNotAllowedException;
use App\Models\JobSource;
use App\Services\Crawler\CrawlOrchestrator;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('crawler:run {source : Slug or id of the job source} {--sync : Run in this process instead of queueing}')]
#[Description('Start a crawl for one job source now.')]
class RunCrawl extends Command
{
    public function handle(CrawlOrchestrator $orchestrator): int
    {
        $key = (string) $this->argument('source');
        $source = JobSource::query()
            ->where('slug', $key)
            ->when(ctype_digit($key), fn ($query) => $query->orWhere('id', (int) $key))
            ->first();

        if ($source === null) {
            $this->error("Job source {$key} not found.");

            return self::FAILURE;
        }

        try {
            $run = $orchestrator->queue($source, CrawlRunTrigger::Manual);
        } catch (CrawlNotAllowedException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        if (! $this->option('sync')) {
            $this->info("Crawl run {$run->uuid} queued on '".config('crawler.queue')."'.");

            return self::SUCCESS;
        }

        $orchestrator->execute($run);
        $run->refresh();

        $this->table(
            ['Status', 'Engine', 'Found', 'Created', 'Updated', 'Unchanged', 'Rejected', 'Errors'],
            [[
                $run->status->value,
                $run->engine_used ?? '-',
                $run->items_found,
                $run->items_created,
                $run->items_updated,
                $run->items_unchanged,
                $run->items_rejected,
                $run->errors()->count(),
            ]],
        );

        return $run->status->isFailure() ? self::FAILURE : self::SUCCESS;
    }
}
