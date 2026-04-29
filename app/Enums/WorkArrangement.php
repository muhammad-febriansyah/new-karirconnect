<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum WorkArrangement: string
{
    use HasLabel;

    case Onsite = 'onsite';
    case Remote = 'remote';
    case Hybrid = 'hybrid';

    public function label(): string
    {
        return match ($this) {
            self::Onsite => 'Onsite',
            self::Remote => 'Remote',
            self::Hybrid => 'Hybrid',
        };
    }
}
