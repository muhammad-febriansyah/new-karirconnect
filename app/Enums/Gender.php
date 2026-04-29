<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum Gender: string
{
    use HasLabel;

    case Male = 'male';
    case Female = 'female';

    public function label(): string
    {
        return match ($this) {
            self::Male => 'Laki-laki',
            self::Female => 'Perempuan',
        };
    }
}
