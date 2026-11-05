<?php

namespace App\Services\ExternalJobs;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\JobStatus;
use App\Enums\ScrapedJobListingStatus;
use App\Enums\WorkArrangement;
use App\Models\Job;
use App\Models\ScrapedJobListing;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use App\Services\Crawler\ListingAttributeMapper;
use App\Services\Jobs\JobService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Publishes scraped listings as portal jobs (`job_posts`).
 *
 * Never twice: `job_posts.scraped_job_listing_id` is unique, already-published
 * listings are skipped, and a listing whose title already exists as an open
 * job of the same company is skipped too.
 */
class ExternalJobPublisher
{
    public function __construct(
        private readonly ExternalCompanyProvisioner $companies,
        private readonly JobService $jobs,
        private readonly AuditLogService $audit,
        private readonly ListingAttributeMapper $mapper,
    ) {}

    /**
     * @param  iterable<ScrapedJobListing>  $listings
     *                                                 Values the source did not state are filled in automatically: the
     *                                                 category from the job title, then full-time, on-site and mid level.
     *                                                 `$defaults` can override those fallbacks.
     * @param  array{job_category_id?: int|null, employment_type?: string|null, work_arrangement?: string|null, experience_level?: string|null}  $defaults
     * @return array{published: list<array{listing_id: int, job_id: int, slug: string}>, skipped: list<array{listing_id: int, title: string, reason: string}>}
     */
    public function publish(iterable $listings, User $admin, array $defaults = []): array
    {
        $result = ['published' => [], 'skipped' => []];

        foreach ($listings as $listing) {
            $this->fillCategory($listing, $defaults);
            $reason = $this->skipReason($listing);
            if ($reason !== null) {
                $result['skipped'][] = ['listing_id' => $listing->id, 'title' => $listing->title, 'reason' => $reason];

                continue;
            }

            try {
                $job = DB::transaction(fn (): Job => $this->publishOne($listing, $defaults));
            } catch (UniqueConstraintViolationException) {
                $result['skipped'][] = ['listing_id' => $listing->id, 'title' => $listing->title, 'reason' => 'Sudah dipublish.'];

                continue;
            }

            $result['published'][] = ['listing_id' => $listing->id, 'job_id' => $job->id, 'slug' => $job->slug];
        }

        $this->audit->record('external_jobs.publish', null, null, [
            'published' => array_column($result['published'], 'listing_id'),
            'skipped' => count($result['skipped']),
        ], $admin);

        return $result;
    }

    /**
     * A listing without a category gets one from its title (and keeps it),
     * or the default category when one was given.
     *
     * @param  array{job_category_id?: int|null}  $defaults
     */
    private function fillCategory(ScrapedJobListing $listing, array $defaults): void
    {
        if ($listing->job_category_id !== null) {
            return;
        }

        $categoryId = $this->mapper->categoryFromTitle($listing->title);
        if ($categoryId !== null) {
            $listing->forceFill(['job_category_id' => $categoryId])->save();

            return;
        }

        if (! empty($defaults['job_category_id'])) {
            $listing->job_category_id = (int) $defaults['job_category_id'];
        }
    }

    private function skipReason(ScrapedJobListing $listing): ?string
    {
        return match (true) {
            $listing->publishedJob()->exists() => 'Sudah dipublish.',
            $listing->status !== ScrapedJobListingStatus::Active => "Status {$listing->status->label()}, hanya lowongan aktif yang dipublish.",
            $listing->application_deadline !== null && $listing->application_deadline->isPast() => 'Batas lamaran sudah lewat.',
            $listing->job_category_id === null => 'Kategori tidak dikenali dari judul. Pilih kategori lewat Edit, lalu publish lagi.',
            $listing->company === null => 'Perusahaan tidak diketahui.',
            $listing->company->applicationEmail() === null => 'Belum ada email HRD atau email perusahaan. Email dicari otomatis; publish lagi setelah ditemukan.',
            $this->duplicateOnPortal($listing) => 'Lowongan dengan judul yang sama sudah tayang untuk perusahaan ini.',
            default => null,
        };
    }

    private function duplicateOnPortal(ScrapedJobListing $listing): bool
    {
        $companyId = $listing->company?->company_id;
        if ($companyId === null) {
            return false;
        }

        return Job::query()
            ->where('company_id', $companyId)
            ->where('status', JobStatus::Published)
            ->whereRaw('LOWER(title) = ?', [Str::lower($listing->title)])
            ->exists();
    }

    /**
     * @param  array{employment_type?: string|null, work_arrangement?: string|null, experience_level?: string|null}  $defaults
     */
    private function publishOne(ScrapedJobListing $listing, array $defaults): Job
    {
        $company = $this->companies->companyFor($listing->company);

        $job = $this->jobs->create($company->id, $this->companies->owner(), [
            'scraped_job_listing_id' => $listing->id,
            'job_category_id' => $listing->job_category_id,
            'title' => $listing->title,
            'description' => $listing->description,
            'responsibilities' => $listing->responsibilities,
            'requirements' => $listing->requirements,
            'benefits' => $listing->benefits,
            // job_posts requires these; the source's own value always wins.
            'employment_type' => $listing->employment_type
                ?? EmploymentType::tryFrom((string) ($defaults['employment_type'] ?? '')) ?? EmploymentType::FullTime,
            'work_arrangement' => $listing->work_arrangement
                ?? WorkArrangement::tryFrom((string) ($defaults['work_arrangement'] ?? '')) ?? WorkArrangement::Onsite,
            'experience_level' => $listing->experience_level
                ?? ExperienceLevel::tryFrom((string) ($defaults['experience_level'] ?? '')) ?? ExperienceLevel::Mid,
            'min_education' => $listing->min_education,
            // job_posts amounts are rupiah; other currencies are not converted.
            'salary_min' => $this->rupiah($listing, $listing->salary_min),
            'salary_max' => $this->rupiah($listing, $listing->salary_max),
            'is_salary_visible' => $listing->is_salary_visible && $this->isRupiah($listing),
            'province_id' => $listing->province_id,
            'city_id' => $listing->city_id,
            'application_deadline' => $listing->application_deadline,
            'external_apply_url' => $listing->apply_url,
        ], $listing->skills->map(fn ($skill): array => [
            'id' => $skill->id,
            'is_required' => (bool) $skill->pivot->is_required,
        ])->all());

        return $this->jobs->publish($job);
    }

    private function isRupiah(ScrapedJobListing $listing): bool
    {
        return $listing->salary_currency === null || $listing->salary_currency === 'IDR';
    }

    private function rupiah(ScrapedJobListing $listing, ?int $amount): ?int
    {
        return $this->isRupiah($listing) ? $amount : null;
    }
}
