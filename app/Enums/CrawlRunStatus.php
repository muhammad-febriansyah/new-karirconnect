<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum CrawlRunStatus: string
{
    use HasLabel;

    case Queued = 'queued';
    case Running = 'running';
    case Succeeded = 'succeeded';
    case Partial = 'partial';
    case SuspectedPartial = 'suspected_partial';
    case Failed = 'failed';
    case Cancelled = 'cancelled';
    case AccessRestricted = 'access_restricted';

    public function label(): string
    {
        return match ($this) {
            self::Queued => 'Antre',
            self::Running => 'Berjalan',
            self::Succeeded => 'Berhasil',
            self::Partial => 'Sebagian',
            self::SuspectedPartial => 'Diduga Tidak Lengkap',
            self::Failed => 'Gagal',
            self::Cancelled => 'Dibatalkan',
            self::AccessRestricted => 'Akses Dibatasi',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Queued, self::Running => 'secondary',
            self::Succeeded => 'success',
            self::Partial, self::SuspectedPartial => 'warning',
            self::Failed, self::AccessRestricted => 'destructive',
            self::Cancelled => 'muted',
        };
    }

    /**
     * A run in this state will not change any more.
     */
    public function isFinished(): bool
    {
        return ! in_array($this, [self::Queued, self::Running], true);
    }

    /**
     * Statuses that count against the source's circuit breaker.
     */
    public function isFailure(): bool
    {
        return in_array($this, [self::Failed, self::AccessRestricted], true);
    }
}
