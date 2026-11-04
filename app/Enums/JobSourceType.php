<?php

namespace App\Enums;

use App\Enums\Concerns\HasLabel;

enum JobSourceType: string
{
    use HasLabel;

    case Greenhouse = 'greenhouse';
    case Lever = 'lever';
    case Sitemap = 'sitemap';
    case GenericHtml = 'generic_html';
    case JobFeed = 'job_feed';
    case Platform = 'platform';

    public function label(): string
    {
        return match ($this) {
            self::Greenhouse => 'Greenhouse Job Board API',
            self::Lever => 'Lever Postings API',
            self::Sitemap => 'Sitemap',
            self::GenericHtml => 'Halaman Karier (HTML)',
            self::JobFeed => 'Feed Lowongan (API)',
            self::Platform => 'Platform Lowongan',
        };
    }

    /**
     * Sources backed by an official public API or feed, as opposed to HTML pages.
     */
    public function isOfficialApi(): bool
    {
        return in_array($this, [self::Greenhouse, self::Lever, self::JobFeed], true);
    }
}
