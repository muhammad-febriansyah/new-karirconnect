<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum ExperienceLevel: string
{
    use HasLabel;

    case Entry = 'entry';
    case Junior = 'junior';
    case Mid = 'mid';
    case Senior = 'senior';
    case Lead = 'lead';
    case Executive = 'executive';

    public function label(): string
    {
        return match ($this) {
            self::Entry => 'Fresh Graduate',
            self::Junior => 'Junior (1-2 tahun)',
            self::Mid => 'Mid-Level (3-5 tahun)',
            self::Senior => 'Senior (5+ tahun)',
            self::Lead => 'Lead / Manager',
            self::Executive => 'Executive',
        };
    }
}
