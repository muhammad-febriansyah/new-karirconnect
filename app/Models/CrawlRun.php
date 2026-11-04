<?php

namespace App\Models;

use App\Enums\CrawlRunStatus;
use App\Enums\CrawlRunTrigger;
use Database\Factories\CrawlRunFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'job_source_id',
    'uuid',
    'status',
    'trigger',
    'triggered_by_user_id',
    'retry_of_crawl_run_id',
    'engine_used',
    'engines_attempted',
    'items_found',
    'items_created',
    'items_updated',
    'items_unchanged',
    'items_rejected',
    'started_at',
    'finished_at',
    'duration_ms',
    'summary',
])]
class CrawlRun extends Model
{
    /** @use HasFactory<CrawlRunFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => CrawlRunStatus::class,
            'trigger' => CrawlRunTrigger::class,
            'engines_attempted' => 'array',
            'summary' => 'array',
            'items_found' => 'integer',
            'items_created' => 'integer',
            'items_updated' => 'integer',
            'items_unchanged' => 'integer',
            'items_rejected' => 'integer',
            'duration_ms' => 'integer',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<JobSource, $this>
     */
    public function source(): BelongsTo
    {
        return $this->belongsTo(JobSource::class, 'job_source_id')->withTrashed();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by_user_id');
    }

    /**
     * @return BelongsTo<CrawlRun, $this>
     */
    public function retryOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'retry_of_crawl_run_id');
    }

    /**
     * @return HasMany<CrawlError, $this>
     */
    public function errors(): HasMany
    {
        return $this->hasMany(CrawlError::class);
    }
}
