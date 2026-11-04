<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum CircuitState: string
{
    use HasLabel;

    case Closed = 'closed';
    case Open = 'open';
    case HalfOpen = 'half_open';

    public function label(): string
    {
        return match ($this) {
            self::Closed => 'Normal',
            self::Open => 'Terputus',
            self::HalfOpen => 'Uji Coba',
        };
    }
}
