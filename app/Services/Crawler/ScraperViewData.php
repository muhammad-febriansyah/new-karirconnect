<?php

namespace App\Services\Crawler;

use App\Models\CrawlError;
use App\Models\CrawlRun;
use App\Models\JobSource;
use Illuminate\Support\Str;

/**
 * Array shapes the scraper admin pages share, so every page renders a run,
 * a source or an error the same way.
 */
class ScraperViewData
{
    /**
     * @return array<string, mixed>
     */
    public static function run(CrawlRun $run): array
    {
        return [
            'id' => $run->id,
            'uuid' => $run->uuid,
            'status' => $run->status->value,
            'status_label' => $run->status->label(),
            'status_tone' => $run->status->color(),
            'is_finished' => $run->status->isFinished(),
            'trigger' => $run->trigger->value,
            'trigger_label' => $run->trigger->label(),
            'engine_used' => $run->engine_used,
            'items_found' => $run->items_found,
            'items_created' => $run->items_created,
            'items_updated' => $run->items_updated,
            'items_unchanged' => $run->items_unchanged,
            'items_rejected' => $run->items_rejected,
            'errors_count' => $run->errors_count ?? null,
            'duration_ms' => $run->duration_ms,
            'started_at' => $run->started_at?->toIso8601String(),
            'finished_at' => $run->finished_at?->toIso8601String(),
            'created_at' => $run->created_at?->toIso8601String(),
            'cancel_requested' => (bool) ($run->summary['cancel_requested'] ?? false),
            'filtered_by_date' => (int) ($run->summary['filtered_by_date'] ?? 0),
            'filtered_outside_indonesia' => (int) ($run->summary['filtered_outside_indonesia'] ?? 0),
            'unread_left' => (int) ($run->summary['stats']['unread_left'] ?? 0),
            'chain_index' => (int) ($run->summary['chain_index'] ?? 1),
            'continues' => ($run->summary['will_continue'] ?? false) === true && empty($run->summary['continued_by']),
            'source' => $run->relationLoaded('source') && $run->source ? self::sourceRef($run->source) : null,
            'triggered_by' => $run->relationLoaded('triggeredBy') ? $run->triggeredBy?->name : null,
        ];
    }

    /**
     * @return array{id: int, name: string, slug: string, type: string, type_label: string, trashed: bool}
     */
    public static function sourceRef(JobSource $source): array
    {
        return [
            'id' => $source->id,
            'name' => $source->name,
            'slug' => $source->slug,
            'type' => $source->type->value,
            'type_label' => $source->type->label(),
            'trashed' => $source->trashed(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function error(CrawlError $error): array
    {
        return [
            'id' => $error->id,
            'crawl_run_id' => $error->crawl_run_id,
            'engine' => $error->engine,
            'category' => $error->category->value,
            'category_label' => $error->category->label(),
            'http_status' => $error->http_status,
            'url' => $error->url,
            'message' => Str::limit($error->message, 500),
            'retryable' => $error->retryable,
            'non_fatal' => (bool) ($error->context['non_fatal'] ?? false),
            'context' => $error->context,
            'occurred_at' => $error->occurred_at?->toIso8601String(),
            'source' => $error->relationLoaded('source') && $error->source ? self::sourceRef($error->source) : null,
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function sourceOptions(): array
    {
        return JobSource::withTrashed()
            ->orderBy('name')
            ->get(['id', 'name', 'deleted_at'])
            ->map(fn (JobSource $source): array => [
                'value' => (string) $source->id,
                'label' => $source->name.($source->trashed() ? ' (dihapus)' : ''),
            ])
            ->all();
    }
}
