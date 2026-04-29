<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum ScreeningQuestionType: string
{
    use HasLabel;

    case Text = 'text';
    case YesNo = 'yes_no';
    case SingleChoice = 'single_choice';
    case MultiChoice = 'multi_choice';
    case Number = 'number';

    public function label(): string
    {
        return match ($this) {
            self::Text => 'Teks',
            self::YesNo => 'Ya / Tidak',
            self::SingleChoice => 'Pilihan Tunggal',
            self::MultiChoice => 'Pilihan Ganda',
            self::Number => 'Angka',
        };
    }
}
