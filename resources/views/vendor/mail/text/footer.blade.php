@php
    try {
        $appName = (string) (app(\App\Services\Settings\SettingService::class)->get('general.app_name') ?: config('app.name'));
    } catch (\Throwable) {
        $appName = (string) config('app.name');
    }
    $appUrl = rtrim((string) config('app.url'), '/');
@endphp
---

Email ini dikirim otomatis oleh sistem {{ $appName }}. Mohon tidak membalas email ini.

Lowongan: {{ $appUrl.'/jobs' }}
Perusahaan: {{ $appUrl.'/companies' }}
Tentang Kami: {{ $appUrl.'/tentang-kami' }}
Kontak: {{ $appUrl.'/contact' }}

Untuk mengubah preferensi notifikasi, kunjungi: {{ $appUrl.'/settings/profile' }}

(c) {{ date('Y') }} {{ $appName }}. Hak cipta dilindungi.
Syarat & Ketentuan: {{ $appUrl.'/legal/terms' }}
Kebijakan Privasi: {{ $appUrl.'/legal/privacy' }}
