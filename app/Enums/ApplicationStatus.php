<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum ApplicationStatus: string
{
    use HasLabel;

    case Submitted = 'submitted';
    case Reviewed = 'reviewed';
    case Shortlisted = 'shortlisted';
    case Interview = 'interview';
    case Offered = 'offered';
    case Hired = 'hired';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';

    public function label(): string
    {
        return match ($this) {
            self::Submitted => 'Dikirim',
            self::Reviewed => 'Ditinjau',
            self::Shortlisted => 'Shortlist',
            self::Interview => 'Interview',
            self::Offered => 'Penawaran',
            self::Hired => 'Diterima',
            self::Rejected => 'Ditolak',
            self::Withdrawn => 'Dibatalkan',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Submitted => 'info',
            self::Reviewed => 'secondary',
            self::Shortlisted => 'primary',
            self::Interview => 'primary',
            self::Offered => 'warning',
            self::Hired => 'success',
            self::Rejected => 'destructive',
            self::Withdrawn => 'muted',
        };
    }
}
