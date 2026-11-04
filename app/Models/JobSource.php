<?php

namespace App\Models;

use App\Enums\CircuitState;
use App\Enums\JobSourceStatus;
use App\Enums\JobSourceType;
use Database\Factories\JobSourceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * An external place job listings are crawled from (an ATS API, a sitemap,
 * a career page). Only `active` sources are ever crawled.
 */
#[Fillable([
    'name',
    'slug',
    'type',
    'base_url',
    'allowed_domains',
    'config',
    'status',
    'permission_notes',
    'robots_checked_at',
    'schedule_minutes',
    'rate_limit_per_minute',
    'max_pages',
    'expected_min_items',
    'browser_allowed',
    'consecutive_failures',
    'circuit_state',
    'circuit_open_until',
    'cooldown_until',
    'last_run_at',
    'last_success_at',
])]
class JobSource extends Model
{
    /** @use HasFactory<JobSourceFactory> */
    use HasFactory, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => JobSourceType::class,
            'status' => JobSourceStatus::class,
            'circuit_state' => CircuitState::class,
            'allowed_domains' => 'array',
            'config' => 'array',
            'browser_allowed' => 'boolean',
            'schedule_minutes' => 'integer',
            'rate_limit_per_minute' => 'integer',
            'max_pages' => 'integer',
            'expected_min_items' => 'integer',
            'consecutive_failures' => 'integer',
            'robots_checked_at' => 'datetime',
            'circuit_open_until' => 'datetime',
            'cooldown_until' => 'datetime',
            'last_run_at' => 'datetime',
            'last_success_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<CrawlRun, $this>
     */
    public function crawlRuns(): HasMany
    {
        return $this->hasMany(CrawlRun::class);
    }

    /**
     * @return HasOne<CrawlRun, $this>
     */
    public function latestCrawlRun(): HasOne
    {
        return $this->hasOne(CrawlRun::class)->latestOfMany();
    }

    /**
     * @return HasMany<CrawlError, $this>
     */
    public function crawlErrors(): HasMany
    {
        return $this->hasMany(CrawlError::class);
    }

    /**
     * @return HasMany<ScrapedJobListing, $this>
     */
    public function listings(): HasMany
    {
        return $this->hasMany(ScrapedJobListing::class);
    }

    /**
     * @return HasMany<ScrapedJobOrigin, $this>
     */
    public function origins(): HasMany
    {
        return $this->hasMany(ScrapedJobOrigin::class);
    }

    /**
     * @param  Builder<JobSource>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('status', JobSourceStatus::Active);
    }

    /**
     * Active sources that are not cooling down and not held open by the
     * circuit breaker. The per-source schedule is checked with isDue().
     *
     * @param  Builder<JobSource>  $query
     */
    public function scopeEligible(Builder $query): void
    {
        $now = now();

        $query->active()
            ->where(fn (Builder $inner) => $inner->whereNull('cooldown_until')->orWhere('cooldown_until', '<=', $now))
            ->where(fn (Builder $inner) => $inner
                ->where('circuit_state', '!=', CircuitState::Open)
                ->orWhereNull('circuit_open_until')
                ->orWhere('circuit_open_until', '<=', $now));
    }

    public function isRunnable(): bool
    {
        return $this->status === JobSourceStatus::Active && ! $this->trashed();
    }

    public function isCoolingDown(): bool
    {
        return $this->cooldown_until !== null && $this->cooldown_until->isFuture();
    }

    public function isCircuitOpen(): bool
    {
        return $this->circuit_state === CircuitState::Open
            && ($this->circuit_open_until === null || $this->circuit_open_until->isFuture());
    }

    /**
     * Whether the schedule says this source should run again now.
     */
    public function isDue(): bool
    {
        if (! $this->isRunnable() || $this->isCoolingDown() || $this->isCircuitOpen()) {
            return false;
        }

        return $this->last_run_at === null
            || $this->last_run_at->copy()->addMinutes($this->schedule_minutes)->lessThanOrEqualTo(now());
    }
}
