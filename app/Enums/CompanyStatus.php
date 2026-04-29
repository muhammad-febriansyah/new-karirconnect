<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum CompanyStatus: string
{
    use HasLabel;

    case Pending = 'pending';
    case Approved = 'approved';
    case Suspended = 'suspended';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu Persetujuan',
            self::Approved => 'Disetujui',
            self::Suspended => 'Dinonaktifkan',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Pending => 'warning',
            self::Approved => 'success',
            self::Suspended => 'destructive',
        };
    }
}
