<?php

namespace App\Services\ExternalJobs;

use App\Enums\ScrapedJobListingStatus;
use App\Models\ScrapedJobListing;
use App\Services\Sanitizer\LikeEscaper;
use Illuminate\Database\Eloquent\Builder;

/**
 * The filters of the Jobs Eksternal table. Shared by the table itself and by
 * "Publish semua", so publishing everything means exactly what is listed.
 */
class ExternalListingFilter
{
    /**
     * @param  Builder<ScrapedJobListing>  $query
     * @param  array{status?: string|null, source?: int|string|null, category?: int|string|null, search?: string|null, published?: string|null, published_from?: string|null, published_to?: string|null, runs?: array<int, int|string>|null}  $filters
     * @return Builder<ScrapedJobListing>
     */
    public static function apply(Builder $query, array $filters): Builder
    {
        $status = ScrapedJobListingStatus::tryFrom((string) ($filters['status'] ?? ''));
        $sourceId = (int) ($filters['source'] ?? 0);
        $categoryId = (int) ($filters['category'] ?? 0);
        $search = trim((string) ($filters['search'] ?? ''));
        $published = (string) ($filters['published'] ?? '');
        $from = self::date($filters['published_from'] ?? null);
        $to = self::date($filters['published_to'] ?? null);
        $runs = array_values(array_filter(array_map('intval', (array) ($filters['runs'] ?? []))));

        return $query
            ->when($status, fn (Builder $q, ScrapedJobListingStatus $value) => $q->where('status', $value))
            ->when($sourceId > 0, fn (Builder $q) => $q->whereHas('origins', fn (Builder $origins) => $origins->where('job_source_id', $sourceId)))
            ->when($categoryId > 0, fn (Builder $q) => $q->where('job_category_id', $categoryId))
            ->when($published === 'yes', fn (Builder $q) => $q->whereHas('publishedJob'))
            ->when($published === 'no', fn (Builder $q) => $q->whereDoesntHave('publishedJob'))
            ->when($from !== null, fn (Builder $q) => $q->whereDate('published_at', '>=', $from))
            ->when($to !== null, fn (Builder $q) => $q->whereDate('published_at', '<=', $to))
            ->when($runs !== [], fn (Builder $q) => $q->whereHas('origins', fn (Builder $origins) => $origins->whereIn('last_crawl_run_id', $runs)))
            ->when($search !== '', function (Builder $q) use ($search): void {
                $like = LikeEscaper::contains($search);
                $q->where(fn (Builder $inner) => $inner
                    ->whereRaw(LikeEscaper::sql('title'), [$like])
                    ->orWhereRaw(LikeEscaper::sql('location_text'), [$like])
                    ->orWhereHas('company', fn (Builder $company) => $company->whereRaw(LikeEscaper::sql('name'), [$like])));
            });
    }

    private static function date(mixed $value): ?string
    {
        return is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 ? $value : null;
    }
}
