<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum JobStatus: string
{
    use HasLabel;

    case Draft = 'draft';
    case Published = 'published';
    case Closed = 'closed';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Published => 'Dipublikasikan',
            self::Closed => 'Ditutup',
            self::Archived => 'Diarsipkan',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Draft => 'secondary',
            self::Published => 'success',
            self::Closed => 'warning',
            self::Archived => 'muted',
        };
    }
}
