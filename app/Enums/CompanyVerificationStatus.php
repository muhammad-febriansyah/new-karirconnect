<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum CompanyVerificationStatus: string
{
    use HasLabel;

    case Unverified = 'unverified';
    case Pending = 'pending';
    case Verified = 'verified';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Unverified => 'Belum Diverifikasi',
            self::Pending => 'Menunggu Verifikasi',
            self::Verified => 'Terverifikasi',
            self::Rejected => 'Verifikasi Ditolak',
        };
    }
}
