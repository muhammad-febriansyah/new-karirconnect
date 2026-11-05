<?php

namespace App\Observers;

use App\Models\ScrapedCompany;
use App\Services\ExternalJobs\ExternalJobEmailGate;

class ScrapedCompanyObserver
{
    public function __construct(private readonly ExternalJobEmailGate $gate) {}

    /**
     * A found or removed email shows or hides the company's external jobs.
     */
    public function updated(ScrapedCompany $company): void
    {
        if ($company->wasChanged(['recruitment_email', 'email'])) {
            $this->gate->sync($company);
        }
    }
}
