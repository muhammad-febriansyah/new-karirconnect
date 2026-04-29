<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum EmploymentType: string
{
    use HasLabel;

    case FullTime = 'full_time';
    case PartTime = 'part_time';
    case Contract = 'contract';
    case Internship = 'internship';
    case Freelance = 'freelance';

    public function label(): string
    {
        return match ($this) {
            self::FullTime => 'Full-time',
            self::PartTime => 'Part-time',
            self::Contract => 'Kontrak',
            self::Internship => 'Magang',
            self::Freelance => 'Freelance',
        };
    }
}
