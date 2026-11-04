<?php

namespace App\Jobs;

use App\Models\ScrapedCompany;
use App\Services\Crawler\CompanyLogoDownloader;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Stores a scraped company's logo locally, off the crawl's critical path.
 * Network errors retry; an unsafe URL or a non-image is skipped for good.
 */
class DownloadScrapedCompanyLogoJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $backoff = 120;

    public int $timeout = 60;

    public function __construct(public readonly int $scrapedCompanyId) {}

    public function handle(CompanyLogoDownloader $downloader): void
    {
        $company = ScrapedCompany::query()->find($this->scrapedCompanyId);

        if ($company !== null) {
            $downloader->download($company);
        }
    }
}
