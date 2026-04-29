<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum InterviewStatus: string
{
    use HasLabel;

    case Scheduled = 'scheduled';
    case Rescheduled = 'rescheduled';
    case Ongoing = 'ongoing';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case NoShow = 'no_show';
    case Expired = 'expired';

    public function label(): string
    {
        return match ($this) {
            self::Scheduled => 'Terjadwal',
            self::Rescheduled => 'Dijadwalkan Ulang',
            self::Ongoing => 'Berlangsung',
            self::Completed => 'Selesai',
            self::Cancelled => 'Dibatalkan',
            self::NoShow => 'Tidak Hadir',
            self::Expired => 'Kedaluwarsa',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Scheduled, self::Rescheduled => 'info',
            self::Ongoing => 'primary',
            self::Completed => 'success',
            self::Cancelled, self::NoShow, self::Expired => 'destructive',
        };
    }
}
