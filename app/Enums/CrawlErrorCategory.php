<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum CrawlErrorCategory: string
{
    use HasLabel;

    case Network = 'network';
    case Timeout = 'timeout';
    case RateLimited = 'rate_limited';
    case AccessRestricted = 'access_restricted';
    case Captcha = 'captcha';
    case ParseError = 'parse_error';
    case ValidationError = 'validation_error';
    case SsrfBlocked = 'ssrf_blocked';
    case Unknown = 'unknown';

    public function label(): string
    {
        return match ($this) {
            self::Network => 'Jaringan',
            self::Timeout => 'Waktu Habis',
            self::RateLimited => 'Dibatasi (429)',
            self::AccessRestricted => 'Akses Dibatasi',
            self::Captcha => 'CAPTCHA',
            self::ParseError => 'Gagal Parsing',
            self::ValidationError => 'Data Tidak Valid',
            self::SsrfBlocked => 'URL Diblokir (SSRF)',
            self::Unknown => 'Tidak Diketahui',
        };
    }

    /**
     * Errors where the crawler must stop instead of trying another engine.
     * The source refused us; working around that is never allowed.
     */
    public function stopsFallback(): bool
    {
        return in_array($this, [self::AccessRestricted, self::Captcha, self::SsrfBlocked], true);
    }
}
