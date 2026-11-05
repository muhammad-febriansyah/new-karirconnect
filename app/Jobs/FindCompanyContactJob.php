<?php

namespace App\Jobs;

use App\Models\ScrapedCompany;
use App\Services\Crawler\CompanyContactFinder;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Searches one company's website for its recruitment email, off the crawl's
 * critical path. One attempt: the next check comes after the recheck period.
 */
class FindCompanyContactJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 120;

    public int $uniqueFor = 3600;

    public function __construct(public readonly int $scrapedCompanyId, public readonly bool $force = false) {}

    public function uniqueId(): string
    {
        return (string) $this->scrapedCompanyId;
    }

    public function handle(CompanyContactFinder $finder): void
    {
        $company = ScrapedCompany::query()->find($this->scrapedCompanyId);

        if ($company !== null && ($this->force || $finder->isDue($company))) {
            $finder->find($company);
        }
    }
}
