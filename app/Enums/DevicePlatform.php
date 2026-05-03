<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum DevicePlatform: string
{
    use HasLabel;

    case Web = 'web';
    case Android = 'android';
    case Ios = 'ios';

    public function label(): string
    {
        return match ($this) {
            self::Web => 'Web',
            self::Android => 'Android',
            self::Ios => 'iOS',
        };
    }
}
