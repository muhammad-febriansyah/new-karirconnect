<?php

namespace App\Models;

use App\Enums\SettingType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'group',
    'key',
    'value',
    'type',
    'label',
    'description',
    'is_public',
    'sort_order',
])]
class Setting extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => SettingType::class,
            'is_public' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Compose dot-notation full key (e.g. "branding.logo_path").
     */
    public function fullKey(): string
    {
        return "{$this->group}.{$this->key}";
    }
}
