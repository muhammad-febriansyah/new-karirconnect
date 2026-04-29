<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum UserRole: string
{
    use HasLabel;

    case Admin = 'admin';
    case Employer = 'employer';
    case Employee = 'employee';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrator',
            self::Employer => 'Perusahaan',
            self::Employee => 'Pencari Kerja',
        };
    }
}
