<?php

namespace App\Models;

use Database\Factories\ScrapedJobOriginFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One place a listing was seen. `(job_source_id, external_id)` is unique, so
 * re-crawling a source updates its origin rows instead of adding new ones.
 */
#[Fillable([
    'scraped_job_listing_id',
    'job_source_id',
    'external_id',
    'source_url',
    'last_crawl_run_id',
    'first_seen_at',
    'last_seen_at',
])]
class ScrapedJobOrigin extends Model
{
    /** @use HasFactory<ScrapedJobOriginFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<ScrapedJobListing, $this>
     */
    public function listing(): BelongsTo
    {
        return $this->belongsTo(ScrapedJobListing::class, 'scraped_job_listing_id');
    }

    /**
     * @return BelongsTo<JobSource, $this>
     */
    public function source(): BelongsTo
    {
        return $this->belongsTo(JobSource::class, 'job_source_id')->withTrashed();
    }

    /**
     * @return BelongsTo<CrawlRun, $this>
     */
    public function lastCrawlRun(): BelongsTo
    {
        return $this->belongsTo(CrawlRun::class, 'last_crawl_run_id');
    }
}
