<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum InterviewStage: string
{
    use HasLabel;

    case Screening = 'screening';
    case HR = 'hr';
    case User = 'user';
    case Technical = 'technical';
    case Final = 'final';

    public function label(): string
    {
        return match ($this) {
            self::Screening => 'Screening Awal',
            self::HR => 'Interview HR',
            self::User => 'Interview User',
            self::Technical => 'Tes Teknis',
            self::Final => 'Interview Final',
        };
    }

    public function order(): int
    {
        return match ($this) {
            self::Screening => 1,
            self::HR => 2,
            self::User => 3,
            self::Technical => 4,
            self::Final => 5,
        };
    }
}
