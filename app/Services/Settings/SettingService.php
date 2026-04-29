<?php

namespace App\Services\Settings;

use App\Enums\SettingType;
use App\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

class SettingService
{
    private const CACHE_KEY = 'settings.all';

    /**
     * Read setting by full dot-key (e.g. "branding.logo_path").
     * Returns decoded/decrypted value cast to its declared type.
     */
    public function get(string $fullKey, mixed $default = null): mixed
    {
        $all = $this->all();

        return $all->has($fullKey) ? $all->get($fullKey)['value'] : $default;
    }

    /**
     * Read entire group as ['key' => value].
     *
     * @return array<string, mixed>
     */
    public function group(string $group): array
    {
        return $this->all()
            ->filter(fn (array $item): bool => $item['group'] === $group)
            ->mapWithKeys(fn (array $item): array => [$item['key'] => $item['value']])
            ->all();
    }

    /**
     * Public settings safe to expose to frontend (is_public=true).
     *
     * @return array<string, array<string, mixed>>
     */
    public function publicByGroup(): array
    {
        return $this->all()
            ->filter(fn (array $item): bool => $item['is_public'])
            ->groupBy('group')
            ->map(fn (Collection $items): array => $items
                ->mapWithKeys(fn (array $item): array => [$item['key'] => $item['public_value']])
                ->all())
            ->all();
    }

    /**
     * Persist a value for an existing setting key. Encrypts if type=password.
     * For file type, expects a stored path string (use uploadFile() to upload).
     */
    public function set(string $group, string $key, mixed $value): Setting
    {
        $setting = Setting::query()
            ->where('group', $group)
            ->where('key', $key)
            ->firstOrFail();

        $setting->value = $this->encodeValue($setting->type, $value);
        $setting->save();

        $this->flush();

        return $setting;
    }

    /**
     * Bulk-update multiple keys within a single group atomically (per-key).
     *
     * @param  array<string, mixed>  $values
     */
    public function setGroup(string $group, array $values): void
    {
        foreach ($values as $key => $value) {
            $this->set($group, $key, $value);
        }
    }

    /**
     * Upload a file (logo/favicon/etc) and store its path on the setting.
     */
    public function uploadFile(string $group, string $key, UploadedFile $file, string $directory = 'settings'): Setting
    {
        $oldPath = $this->get("{$group}.{$key}");

        if (is_string($oldPath) && $oldPath !== '' && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        $path = $file->store($directory, 'public');

        return $this->set($group, $key, $path);
    }

    /**
     * Invalidate cache. Call after any direct DB change.
     */
    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Resolve all settings keyed by "group.key", with cast/decrypted value.
     * Returns an empty collection if the table is not yet migrated (eg. before
     * the install/test bootstrap completes) so the middleware doesn't crash.
     *
     * Cache stores a plain array (not a Collection) so cache drivers that
     * serialize to disk/db cannot return __PHP_Incomplete_Class on retrieval.
     */
    private function all(): Collection
    {
        $cached = Cache::get(self::CACHE_KEY);

        if (is_array($cached)) {
            return collect($cached);
        }

        $resolved = $this->resolveFromDatabase();

        if ($resolved->isNotEmpty()) {
            Cache::forever(self::CACHE_KEY, $resolved->all());
        }

        return $resolved;
    }

    private function resolveFromDatabase(): Collection
    {
        try {
            return Setting::query()
                ->orderBy('group')
                ->orderBy('sort_order')
                ->get()
                ->mapWithKeys(function (Setting $setting): array {
                    $decoded = $this->decodeValue($setting->type, $setting->value);

                    return [
                        $setting->fullKey() => [
                            'group' => $setting->group,
                            'key' => $setting->key,
                            'value' => $decoded,
                            'public_value' => $setting->type === SettingType::Password ? null : $decoded,
                            'type' => $setting->type->value,
                            'is_public' => $setting->is_public,
                        ],
                    ];
                });
        } catch (\Throwable) {
            return collect();
        }
    }

    private function decodeValue(SettingType $type, ?string $raw): mixed
    {
        if ($raw === null || $raw === '') {
            return match ($type) {
                SettingType::Bool => false,
                SettingType::Int, SettingType::Float => null,
                SettingType::Json => [],
                default => null,
            };
        }

        return match ($type) {
            SettingType::Bool => filter_var($raw, FILTER_VALIDATE_BOOLEAN),
            SettingType::Int => (int) $raw,
            SettingType::Float => (float) $raw,
            SettingType::Json => json_decode($raw, true) ?? [],
            SettingType::Password => $this->safeDecrypt($raw),
            default => $raw,
        };
    }

    private function encodeValue(SettingType $type, mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return match ($type) {
            SettingType::Bool => $value ? '1' : '0',
            SettingType::Int => (string) (int) $value,
            SettingType::Float => (string) (float) $value,
            SettingType::Json => json_encode($value, JSON_UNESCAPED_UNICODE),
            SettingType::Password => $value === '' ? null : Crypt::encryptString((string) $value),
            default => (string) $value,
        };
    }

    private function safeDecrypt(string $raw): ?string
    {
        try {
            return Crypt::decryptString($raw);
        } catch (\Throwable) {
            return null;
        }
    }
}
