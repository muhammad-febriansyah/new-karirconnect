<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum MessageTemplateCategory: string
{
    use HasLabel;

    case Invitation = 'invitation';
    case Rejection = 'rejection';
    case Offer = 'offer';
    case FollowUp = 'followup';
    case Custom = 'custom';

    public function label(): string
    {
        return match ($this) {
            self::Invitation => 'Undangan',
            self::Rejection => 'Penolakan',
            self::Offer => 'Tawaran',
            self::FollowUp => 'Follow Up',
            self::Custom => 'Lainnya',
        };
    }
}
