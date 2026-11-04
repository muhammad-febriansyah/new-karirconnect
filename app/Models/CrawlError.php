<?php

namespace App\Models;

use App\Enums\CrawlErrorCategory;
use Database\Factories\CrawlErrorFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'crawl_run_id',
    'job_source_id',
    'engine',
    'category',
    'http_status',
    'url',
    'message',
    'retryable',
    'context',
    'occurred_at',
])]
class CrawlError extends Model
{
    /** @use HasFactory<CrawlErrorFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'category' => CrawlErrorCategory::class,
            'http_status' => 'integer',
            'retryable' => 'boolean',
            'context' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<CrawlRun, $this>
     */
    public function run(): BelongsTo
    {
        return $this->belongsTo(CrawlRun::class, 'crawl_run_id');
    }

    /**
     * @return BelongsTo<JobSource, $this>
     */
    public function source(): BelongsTo
    {
        return $this->belongsTo(JobSource::class, 'job_source_id')->withTrashed();
    }
}
