<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum JobSourceStatus: string
{
    use HasLabel;

    case Active = 'active';
    case Disabled = 'disabled';
    case PendingPermission = 'pending_permission';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Aktif',
            self::Disabled => 'Nonaktif',
            self::PendingPermission => 'Menunggu Izin',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Active => 'success',
            self::Disabled => 'muted',
            self::PendingPermission => 'warning',
        };
    }
}
