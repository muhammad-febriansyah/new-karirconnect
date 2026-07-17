<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class AuditLogService
{
    /**
     * Record a sensitive action against an optional subject record. Uses the
     * request() helper so we always get the current request — important
     * because some callers (e.g. SettingService) are bound as singletons.
     *
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    public function record(string $action, ?Model $subject = null, ?array $before = null, ?array $after = null, ?User $actor = null): AuditLog
    {
        $request = request();

        return AuditLog::query()->create([
            'user_id' => $actor?->id ?? $request->user()?->id,
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'before_values' => $before,
            'after_values' => $after,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);
    }

    /**
     * Most recent entries for a single action, newest first. Surfaced next to
     * sensitive tools so an admin sees who else has used them lately without
     * digging through the full audit log.
     *
     * @return list<array{id: int, actor: string, ip_address: string|null, created_at: string|null}>
     */
    public function recentByAction(string $action, int $limit = 10): array
    {
        return AuditLog::query()
            ->with('user:id,name')
            ->where('action', $action)
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (AuditLog $log): array => [
                'id' => $log->id,
                'actor' => $log->user?->name ?? 'Pengguna terhapus',
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at?->toIso8601String(),
            ])
            ->all();
    }
}
