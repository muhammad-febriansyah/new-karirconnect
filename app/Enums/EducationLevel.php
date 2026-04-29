<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum EducationLevel: string
{
    use HasLabel;

    case SMA = 'sma';
    case D3 = 'd3';
    case D4 = 'd4';
    case S1 = 's1';
    case S2 = 's2';
    case S3 = 's3';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::SMA => 'SMA / SMK',
            self::D3 => 'Diploma 3',
            self::D4 => 'Diploma 4',
            self::S1 => 'Sarjana (S1)',
            self::S2 => 'Magister (S2)',
            self::S3 => 'Doktor (S3)',
            self::Other => 'Lainnya',
        };
    }
}
