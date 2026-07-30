<?php

namespace App\Models;

use Database\Factories\CareerResourceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'title',
    'slug',
    'excerpt',
    'body',
    'thumbnail_path',
    'category',
    'tags',
    'author_id',
    'is_published',
    'published_at',
    'views_count',
    'reading_minutes',
])]
class CareerResource extends Model
{
    /** @use HasFactory<CareerResourceFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'is_published' => 'boolean',
            'published_at' => 'datetime',
            'views_count' => 'integer',
            'reading_minutes' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /**
     * Articles the public may see: published, and their moment has arrived.
     *
     * A null `published_at` counts as live. Articles written before scheduling
     * existed have no date, and treating those as pending would pull them off
     * the site the day this scope shipped.
     *
     * @param  Builder<CareerResource>  $query
     */
    public function scopeLive(Builder $query): void
    {
        $query->where('is_published', true)
            ->where(function (Builder $inner): void {
                $inner->whereNull('published_at')
                    ->orWhere('published_at', '<=', now());
            });
    }

    /**
     * Queued for a date that has not come yet. Nothing publishes these -- the
     * `live` scope simply starts matching them once the clock passes, so a
     * missed cron or a stopped queue worker cannot strand an article.
     *
     * @param  Builder<CareerResource>  $query
     */
    public function scopeScheduled(Builder $query): void
    {
        $query->where('is_published', true)
            ->whereNotNull('published_at')
            ->where('published_at', '>', now());
    }

    public function isScheduled(): bool
    {
        return $this->is_published
            && $this->published_at !== null
            && $this->published_at->isFuture();
    }

    public function isLive(): bool
    {
        return $this->is_published && ! $this->isScheduled();
    }
}
