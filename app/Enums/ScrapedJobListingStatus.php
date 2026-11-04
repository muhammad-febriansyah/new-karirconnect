<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum ScrapedJobListingStatus: string
{
    use HasLabel;

    case Active = 'active';
    case Stale = 'stale';
    case Expired = 'expired';
    case Hidden = 'hidden';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Aktif',
            self::Stale => 'Tidak Terlihat',
            self::Expired => 'Kedaluwarsa',
            self::Hidden => 'Disembunyikan',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Active => 'success',
            self::Stale => 'warning',
            self::Expired => 'muted',
            self::Hidden => 'secondary',
        };
    }
}
