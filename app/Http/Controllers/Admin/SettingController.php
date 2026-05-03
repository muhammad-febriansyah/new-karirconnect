<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SettingType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use App\Mail\TestSmtpMail;
use App\Models\Setting;
use App\Services\Settings\SettingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class SettingController extends Controller
{
    private const GROUPS = [
        'general' => 'Umum',
        'branding' => 'Branding',
        'seo' => 'SEO & Meta',
        'ai' => 'AI Provider',
        'payment' => 'Payment Gateway (Duitku)',
        'email' => 'Email & SMTP',
        'security' => 'Keamanan',
        'feature_flags' => 'Feature Flags',
        'legal' => 'Halaman Legal',
    ];

    public function __construct(private readonly SettingService $settings) {}

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
                    'value' => $rawValue,
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

            $this->settings->set($group, $key, $value);
        }

        return back()->with('success', 'Pengaturan berhasil disimpan.');
    }

    public function testEmail(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'recipient_email' => ['required', 'email:rfc,dns', 'max:160'],
        ]);

        try {
            Mail::to($data['recipient_email'])->send(
                new TestSmtpMail(sentBy: $request->user()?->name ?? 'Admin'),
            );
        } catch (Throwable $throwable) {
            report($throwable);

            return back()->with('error', 'Test email gagal dikirim. Periksa konfigurasi SMTP/API token Anda.');
        }

        return back()->with('success', "Test email berhasil dikirim ke {$data['recipient_email']}.");
    }
}
