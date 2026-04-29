<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum AiInterviewStatus: string
{
    use HasLabel;

    case Pending = 'pending';
    case Invited = 'invited';
    case InProgress = 'in_progress';
    case Completed = 'completed';
    case Expired = 'expired';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu',
            self::Invited => 'Diundang',
            self::InProgress => 'Sedang Berlangsung',
            self::Completed => 'Selesai',
            self::Expired => 'Kedaluwarsa',
            self::Cancelled => 'Dibatalkan',
        };
    }
}
