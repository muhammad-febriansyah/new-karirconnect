<?php

namespace App\Services\ExternalJobs;

use App\Enums\JobStatus;
use App\Enums\ScrapedJobListingStatus;
use App\Models\Job;
use App\Models\ScrapedCompany;
use Illuminate\Database\Eloquent\Builder;

/**
 * An external job is only shown on the portal while its company has an email
 * to receive applications (HRD or the company's own). Without one the job is
 * kept as a draft, and it goes live again once an email is found.
 */
class ExternalJobEmailGate
{
    /**
     * Hide every published external job whose company has no email.
     */
    public function hideAllWithoutEmail(): int
    {
        return Job::query()
            ->where('status', JobStatus::Published)
            ->whereHas('scrapedListing.company', fn (Builder $query) => $query
                ->where(fn (Builder $query) => $query->whereNull('recruitment_email')->orWhere('recruitment_email', ''))
                ->where(fn (Builder $query) => $query->whereNull('email')->orWhere('email', '')))
            ->update(['status' => JobStatus::Draft]);
    }

    /**
     * Hide or show again the company's external jobs after its emails changed.
     */
    public function sync(ScrapedCompany $company): int
    {
        $jobs = Job::query()->whereIn('scraped_job_listing_id', $company->listings()->select('id'));

        if ($company->applicationEmail() === null) {
            return $jobs->where('status', JobStatus::Published)->update(['status' => JobStatus::Draft]);
        }

        return $jobs
            ->where('status', JobStatus::Draft)
            ->where(fn (Builder $query) => $query->whereNull('application_deadline')->orWhere('application_deadline', '>=', now()->startOfDay()))
            ->whereHas('scrapedListing', fn (Builder $query) => $query->where('status', ScrapedJobListingStatus::Active))
            ->update(['status' => JobStatus::Published, 'closed_at' => null]);
    }
}
