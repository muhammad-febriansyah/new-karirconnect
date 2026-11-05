<?php

namespace App\Console\Commands\Crawler;

use App\Models\ScrapedCompany;
use App\Services\Crawler\CompanyContactFinder;
use App\Services\ExternalJobs\ExternalJobEmailGate;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('crawler:find-contacts {--limit=200 : At most this many companies} {--force : Search again companies checked recently that still have no email}')]
#[Description('Queue a website search for the recruitment email of companies that have none yet.')]
class FindCompanyContacts extends Command
{
    public function handle(CompanyContactFinder $finder, ExternalJobEmailGate $gate): int
    {
        $hidden = $gate->hideAllWithoutEmail();
        if ($hidden > 0) {
            $this->info("{$hidden} lowongan eksternal tanpa email disembunyikan dari portal.");
        }

        $queued = 0;

        ScrapedCompany::query()
            ->whereNull('recruitment_email')
            ->orderBy('id')
            ->each(function (ScrapedCompany $company) use ($finder, &$queued): bool {
                if ($finder->isDue($company)) {
                    $finder->queueIfDue($company);
                    $queued++;
                } elseif ($this->option('force') && $company->applicationEmail() === null && $finder->isSearchable($company)) {
                    $finder->queue($company, force: true);
                    $queued++;
                }

                return $queued < (int) $this->option('limit');
            });

        $this->info("{$queued} perusahaan diantrikan untuk dicari email rekrutmennya.");

        return self::SUCCESS;
    }
}
