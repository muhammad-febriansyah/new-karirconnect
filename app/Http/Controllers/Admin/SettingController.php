<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SettingType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use App\Models\Setting;
use App\Services\Settings\SettingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    private const GROUPS = [
        'general' => 'Umum',
        'branding' => 'Branding',
        'seo' => 'SEO & Meta',
        'ai' => 'AI Provider',
        'payment' => 'Payment Gateway (Duitku)',
        'email' => 'Email & SMTP',
        'feature_flags' => 'Feature Flags',
        'legal' => 'Halaman Legal',
    ];

    public function __construct(private readonly SettingService $settings)
    {
    }

    public function edit(Request $request, ?string $group = null): Response
    {
        $group = $group ?? 'general';

        abort_unless(array_key_exists($group, self::GROUPS), 404);

        $settings = Setting::query()
            ->where('group', $group)
            ->orderBy('sort_order')
            ->get()
            ->map(function (Setting $setting): array {
                $rawValue = $this->settings->get($setting->fullKey());

                return [
                    'key' => $setting->key,
                    'type' => $setting->type->value,
                    'label' => $setting->label,
                    'description' => $setting->description,
                    'is_public' => $setting->is_public,
                    'value' => $setting->type === SettingType::Password
                        ? ($rawValue ? '__keep__' : null)
                        : $rawValue,
                    'value_url' => $setting->type === SettingType::File && is_string($rawValue) && $rawValue !== ''
                        ? asset('storage/'.$rawValue)
                        : null,
                ];
            })
            ->values();

        return Inertia::render('admin/settings/edit', [
            'currentGroup' => $group,
            'groups' => collect(self::GROUPS)
                ->map(fn (string $label, string $key) => ['key' => $key, 'label' => $label])
                ->values(),
            'settings' => $settings,
        ]);
    }

    public function update(UpdateSettingsRequest $request): RedirectResponse
    {
        $group = (string) $request->validated('group');
        $values = $request->validated('values', []);

        $records = Setting::query()
            ->where('group', $group)
            ->get()
            ->keyBy('key');

        foreach ($records as $key => $setting) {
            if ($setting->type === SettingType::File) {
                $uploaded = $request->file("files.{$key}");
                if ($uploaded !== null) {
                    $this->settings->uploadFile($group, $key, $uploaded, "settings/{$group}");
                }
                continue;
            }

            if (! array_key_exists($key, $values)) {
                continue;
            }

            $value = $values[$key];

            if ($setting->type === SettingType::Password && $value === '__keep__') {
                continue;
            }

            $this->settings->set($group, $key, $value);
        }

        return back()->with('success', 'Pengaturan berhasil disimpan.');
    }
}
