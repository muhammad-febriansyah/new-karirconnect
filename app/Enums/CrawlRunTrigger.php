<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum CrawlRunTrigger: string
{
    use HasLabel;

    case Schedule = 'schedule';
    case Manual = 'manual';
    case Retry = 'retry';

    public function label(): string
    {
        return match ($this) {
            self::Schedule => 'Terjadwal',
            self::Manual => 'Manual',
            self::Retry => 'Ulang',
        };
    }
}
