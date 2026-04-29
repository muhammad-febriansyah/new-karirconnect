<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum AiInterviewMode: string
{
    use HasLabel;

    case Text = 'text';
    case Voice = 'voice';

    public function label(): string
    {
        return match ($this) {
            self::Text => 'Berbasis Teks',
            self::Voice => 'Berbasis Suara',
        };
    }
}
