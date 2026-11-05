<?php

namespace App\Services\Crawler;

use App\Enums\JobSourceType;
use App\Enums\JobStatus;
use App\Enums\ScrapedJobListingStatus;
use App\Models\CrawlRun;
use App\Models\Job;
use App\Models\JobSource;
use App\Models\ScrapedCompany;
use App\Models\ScrapedJobListing;
use App\Models\ScrapedJobOrigin;
use App\Services\Sanitizer\HtmlSanitizerService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Stores the worker's items idempotently.
 *
 *  1. `(job_source_id, external_id)` on origins is the identity: a re-crawl
 *     updates the same listing instead of adding a new one.
 *  2. An unseen item whose content hash matches an existing listing (the same
 *     vacancy on another source) becomes an extra origin of that listing.
 *  3. Otherwise a new listing is created.
 */
class ListingIngestor
{
    public function __construct(
        private readonly ResultValidator $validator,
        private readonly ListingAttributeMapper $mapper,
        private readonly ScrapedCompanyUpserter $companies,
        private readonly HtmlSanitizerService $sanitizer,
    ) {}

    /**
     * @param  list<array<string, mixed>>  $items
     * @param  array<string, mixed>|null  $companyProfile
     * @return array{created: int, updated: int, unchanged: int, filtered: int, rejected: list<array{external_id: string|null, url: string|null, problems: list<string>}>}
     */
    public function ingest(JobSource $source, CrawlRun $run, array $items, ?array $companyProfile): array
    {
        $counts = ['created' => 0, 'updated' => 0, 'unchanged' => 0, 'filtered' => 0, 'rejected' => []];
        $indonesiaOnly = (bool) config('job_catalog.indonesia_only');
        $boardCompany = null;

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $problems = $this->validator->problems($item);
            if ($problems !== []) {
                $counts['rejected'][] = [
                    'external_id' => is_string($item['external_id'] ?? null) ? $item['external_id'] : null,
                    'url' => is_string($item['source_url'] ?? null) ? $item['source_url'] : null,
                    'problems' => $problems,
                ];

                continue;
            }

            if ($indonesiaOnly && ! $this->isInIndonesia($item)) {
                $counts['filtered']++;

                continue;
            }

            $itemCompany = is_string($item['company_name'] ?? null) && trim($item['company_name']) !== '' ? trim($item['company_name']) : null;

            $boardName = is_string($companyProfile['name'] ?? null) ? $companyProfile['name'] : null;
            $ownEmployer = $itemCompany !== null && (
                $source->type === JobSourceType::JobFeed
                || $boardName === null
                || ScrapedCompany::normalizeName($boardName) !== ScrapedCompany::normalizeName($itemCompany)
            );

            if ($ownEmployer) {
                // Feeds and job boards list many employers: each item is its
                // own company, with the logo the source gives for it.
                $company = $this->companies->upsert($source, [
                    'name' => $itemCompany,
                    'logo_url' => $item['company_logo_url'] ?? null,
                    'website' => $item['company_website'] ?? null,
                    'about' => $item['company_about'] ?? null,
                    'size_raw' => $item['company_size_raw'] ?? null,
                    'industry_raw' => $item['company_industry_raw'] ?? null,
                    'culture' => $item['company_culture'] ?? null,
                    'benefits' => $item['company_benefits'] ?? null,
                    'location_raw' => $item['company_location_raw'] ?? null,
                ], $itemCompany);
            } elseif ($itemCompany === null) {
                $company = $boardCompany ??= $this->companies->upsert($source, $companyProfile, null);
            } else {
                $company = $this->companies->upsert($source, $companyProfile, $itemCompany);
            }

            $outcome = $this->store($source, $run, $item, $company);
            $counts[$outcome]++;

            $this->companies->rememberContactEmail($company, $item['contact_email'] ?? null, $item['source_url'] ?? null);
        }

        return $counts;
    }

    /**
     * Jobs Eksternal shows jobs in Indonesia only. A posting qualifies when its
     * location matches a city or province in the master data, or names
     * Indonesia / the ID country code. "Remote, Worldwide" does not.
     *
     * @param  array<string, mixed>  $item
     */
    private function isInIndonesia(array $item): bool
    {
        $text = is_string($item['location_text'] ?? null) ? $item['location_text'] : '';
        $country = strtoupper((string) ($item['country_raw'] ?? ''));

        if (in_array($country, ['ID', 'IDN', 'INDONESIA'], true)) {
            return true;
        }
        if (preg_match('/indonesia|(^|[\s,;(])(ID|IDN)([\s,;)]|$)/iu', $text) === 1) {
            return true;
        }

        $location = $this->mapper->location($text);

        return $location['city_id'] !== null || $location['province_id'] !== null;
    }

    /**
     * Mark this source's listings that the run did not see as stale, and
     * listings whose deadline passed as expired. Only called after a run
     * that is known to be complete.
     */
    public function markUnseen(JobSource $source, CrawlRun $run): int
    {
        $expired = ScrapedJobListing::query()
            ->where('job_source_id', $source->id)
            ->whereIn('status', [ScrapedJobListingStatus::Active, ScrapedJobListingStatus::Stale])
            ->whereNotNull('application_deadline')
            ->whereDate('application_deadline', '<', today())
            ->update(['status' => ScrapedJobListingStatus::Expired]);

        $stale = ScrapedJobListing::query()
            ->where('job_source_id', $source->id)
            ->where('status', ScrapedJobListingStatus::Active)
            ->where('last_seen_at', '<', $run->started_at)
            ->update(['status' => ScrapedJobListingStatus::Stale]);

        // A published external job closes when its source listing is gone.
        Job::query()
            ->where('status', JobStatus::Published)
            ->whereIn('scraped_job_listing_id', ScrapedJobListing::query()
                ->select('id')
                ->where('job_source_id', $source->id)
                ->whereIn('status', [ScrapedJobListingStatus::Stale, ScrapedJobListingStatus::Expired]))
            ->update(['status' => JobStatus::Closed, 'closed_at' => now()]);

        return $expired + $stale;
    }

    /**
     * @param  array<string, mixed>  $item
     * @return 'created'|'updated'|'unchanged'
     */
    private function store(JobSource $source, CrawlRun $run, array $item, ScrapedCompany $company): string
    {
        $attributes = $this->attributes($item, $company);
        $externalId = trim($item['external_id']);
        $sourceUrl = ResultValidator::isHttpUrl($item['source_url'] ?? null) ? $item['source_url'] : $attributes['apply_url'];
        $now = now();
        $taggedSkills = is_array($item['skills_raw'] ?? null) ? $item['skills_raw'] : [];

        try {
            return DB::transaction(function () use ($source, $run, $attributes, $externalId, $sourceUrl, $now, $taggedSkills): string {
                $origin = ScrapedJobOrigin::query()
                    ->where('job_source_id', $source->id)
                    ->where('external_id', $externalId)
                    ->lockForUpdate()
                    ->first();

                $listing = $origin?->listing;
                $outcome = 'unchanged';

                if ($listing === null) {
                    $listing = ScrapedJobListing::query()
                        ->where('content_hash', $attributes['content_hash'])
                        ->where('status', '!=', ScrapedJobListingStatus::Hidden)
                        ->first();
                }

                if ($listing === null) {
                    $listing = ScrapedJobListing::query()->create([
                        ...$attributes,
                        'job_source_id' => $source->id,
                        'external_id' => $externalId,
                        'status' => ScrapedJobListingStatus::Active,
                        'first_seen_at' => $now,
                        'last_seen_at' => $now,
                    ]);
                    $this->syncSkills($listing, $attributes, $taggedSkills);
                    $outcome = 'created';
                } elseif ($listing->job_source_id === $source->id && $listing->edited_at !== null) {
                    // Edited by an admin: keep their content, only note it was seen.
                    $listing->last_seen_at = $now;
                    if ($listing->status === ScrapedJobListingStatus::Stale) {
                        $listing->status = ScrapedJobListingStatus::Active;
                    }
                    $listing->save();
                } elseif ($listing->job_source_id === $source->id) {
                    // This source owns the listing: refresh its content.
                    $changed = $listing->content_hash !== $attributes['content_hash'];
                    $listing->fill($attributes);
                    $listing->last_seen_at = $now;
                    if ($listing->status === ScrapedJobListingStatus::Stale) {
                        $listing->status = ScrapedJobListingStatus::Active;
                    }
                    $listing->save();
                    $this->syncSkills($listing, $attributes, $taggedSkills);
                    if ($changed) {
                        $outcome = 'updated';
                    }
                } else {
                    // Same vacancy owned by another source: only record that we saw it.
                    $listing->forceFill(['last_seen_at' => $now])->save();
                }

                ScrapedJobOrigin::query()->updateOrCreate(
                    ['job_source_id' => $source->id, 'external_id' => $externalId],
                    [
                        'scraped_job_listing_id' => $listing->id,
                        'source_url' => $sourceUrl,
                        'last_crawl_run_id' => $run->id,
                        'last_seen_at' => $now,
                        'first_seen_at' => $origin?->first_seen_at ?? $now,
                    ],
                );

                return $outcome;
            });
        } catch (UniqueConstraintViolationException) {
            // A concurrent run stored the same item first; it is there now.
            return 'unchanged';
        }
    }

    /**
     * Columns that mirror `job_posts`, plus the crawl-only fields.
     *
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function attributes(array $item, ScrapedCompany $company): array
    {
        $title = $this->validator->title($item);
        $locationText = $this->text($item['location_text'] ?? null, 255);
        $employmentType = $this->mapper->employmentType($item['employment_type_raw'] ?? null);
        $location = $this->mapper->location($locationText);
        $salary = is_array($item['salary'] ?? null) ? $item['salary'] : [];
        $sections = [];
        foreach (['description', 'responsibilities', 'requirements', 'benefits'] as $field) {
            $clean = $this->sanitizer->clean(is_string($item[$field] ?? null) ? $item[$field] : null);
            $sections[$field] = $clean === '' ? null : $clean;
        }

        return [
            'scraped_company_id' => $company->id,
            'job_category_id' => $this->mapper->categoryId($item['department_raw'] ?? null) ?? $this->mapper->categoryFromTitle($title),
            'title' => $title,
            ...$sections,
            'employment_type' => $employmentType,
            'work_arrangement' => $this->mapper->workArrangement($item['workplace_type_raw'] ?? null, $locationText),
            'experience_level' => $this->mapper->experienceLevel($title),
            'min_education' => null,
            'salary_min' => $salary['min'] ?? null,
            'salary_max' => $salary['max'] ?? null,
            'salary_currency' => is_string($salary['currency'] ?? null) ? strtoupper(substr($salary['currency'], 0, 3)) : null,
            'is_salary_visible' => isset($salary['min']) || isset($salary['max']),
            'province_id' => $location['province_id'],
            'city_id' => $location['city_id'],
            'application_deadline' => ResultValidator::date($item['application_deadline'] ?? null)?->toDateString(),
            'published_at' => ResultValidator::date($item['published_at'] ?? null),
            'location_text' => $locationText,
            'apply_url' => $item['apply_url'],
            'contact_email' => filter_var($item['contact_email'] ?? null, FILTER_VALIDATE_EMAIL) ?: null,
            'raw_attributes' => array_filter([
                'employment_type' => $item['employment_type_raw'] ?? null,
                'workplace_type' => $item['workplace_type_raw'] ?? null,
                'department' => $item['department_raw'] ?? null,
                'country' => $item['country_raw'] ?? null,
                'salary_interval' => $salary['interval'] ?? null,
                'updated_at' => $item['updated_at'] ?? null,
            ], fn (mixed $value): bool => $value !== null && $value !== ''),
            'content_hash' => ScrapedJobListing::computeContentHash([
                'title' => $title,
                'company' => $company->normalized_name,
                'location_text' => $locationText,
                'employment_type' => $employmentType,
                'description' => implode(' ', array_filter($sections)),
            ]),
        ];
    }

    /**
     * Skills named in the text, plus the skills the source tags the posting
     * with (counted as required).
     *
     * @param  array<string, mixed>  $attributes
     * @param  mixed  $taggedSkills  the item's `skills_raw`
     */
    private function syncSkills(ScrapedJobListing $listing, array $attributes, mixed $taggedSkills = []): void
    {
        $tagged = implode(', ', array_filter(is_array($taggedSkills) ? $taggedSkills : [], 'is_string'));
        $ids = $this->mapper->skillIds($attributes['requirements'] ?? null, $attributes['responsibilities'] ?? null, $tagged);
        $requirementIds = $this->mapper->skillIds($attributes['requirements'] ?? null, $tagged);

        $listing->skills()->sync(collect($ids)->mapWithKeys(fn (int $id): array => [
            $id => ['is_required' => in_array($id, $requirementIds, true)],
        ])->all());
    }

    private function text(mixed $value, int $max): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $text = trim(preg_replace('/\s+/u', ' ', strip_tags($value)) ?? '');

        return $text === '' ? null : mb_substr($text, 0, $max);
    }
}
