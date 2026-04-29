<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum InterviewMode: string
{
    use HasLabel;

    case Ai = 'ai';
    case Online = 'online';
    case Onsite = 'onsite';

    public function label(): string
    {
        return match ($this) {
            self::Ai => 'AI Interview',
            self::Online => 'Online Meeting',
            self::Onsite => 'Onsite / Tatap Muka',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Ai => 'Wawancara otomatis dengan AI — fleksibel, tanpa janji ulang.',
            self::Online => 'Wawancara via Google Meet atau platform online lain.',
            self::Onsite => 'Wawancara langsung di lokasi kantor perusahaan.',
        };
    }
}
