<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'hero_title',
    'hero_subtitle',
    'hero_image_path',
    'story_body',
    'vision',
    'mission',
    'values',
    'stats',
    'team_members',
    'office_address',
    'office_map_embed',
    'seo_title',
    'seo_description',
])]
class AboutPage extends Model
{
    /**
     * Singleton accessor — there is only ever one About page row. Auto-creates
     * an empty row on first access so the admin form always has something to
     * bind to without needing a separate "create" flow.
     */
    public static function firstSingleton(): self
    {
        return self::query()->firstOrCreate([]);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'values' => 'array',
            'stats' => 'array',
            'team_members' => 'array',
        ];
    }
}
