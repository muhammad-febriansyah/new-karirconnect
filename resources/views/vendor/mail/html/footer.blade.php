@php
    try {
        $settings = app(\App\Services\Settings\SettingService::class);
        $appName = (string) ($settings->get('general.app_name') ?: config('app.name'));
    } catch (\Throwable) {
        $appName = (string) config('app.name');
    }
    $appUrl = rtrim((string) config('app.url'), '/');
@endphp
<tr>
<td>
<table class="footer" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td class="content-cell" align="center" style="padding: 28px 24px 20px 24px;">

<table align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 18px;">
<tr>
<td align="center" style="padding-bottom: 14px;">
<a href="{{ $appUrl.'/jobs' }}" style="display: inline-block; padding: 0 10px; color: #475569; font-size: 12px; font-weight: 500; text-decoration: none;">Lowongan</a>
<span style="color: #cbd5e1;">·</span>
<a href="{{ $appUrl.'/companies' }}" style="display: inline-block; padding: 0 10px; color: #475569; font-size: 12px; font-weight: 500; text-decoration: none;">Perusahaan</a>
<span style="color: #cbd5e1;">·</span>
<a href="{{ $appUrl.'/tentang-kami' }}" style="display: inline-block; padding: 0 10px; color: #475569; font-size: 12px; font-weight: 500; text-decoration: none;">Tentang Kami</a>
<span style="color: #cbd5e1;">·</span>
<a href="{{ $appUrl.'/contact' }}" style="display: inline-block; padding: 0 10px; color: #475569; font-size: 12px; font-weight: 500; text-decoration: none;">Kontak</a>
</td>
</tr>
</table>

<p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px; line-height: 1.6;">
Email ini dikirim otomatis oleh sistem {{ $appName }}. Mohon tidak membalas langsung ke email ini.
</p>
<p style="margin: 0 0 14px 0; color: #94a3b8; font-size: 11px; line-height: 1.6;">
Untuk mengubah preferensi notifikasi, kunjungi <a href="{{ $appUrl.'/settings/profile' }}" style="color: #1d70d8; text-decoration: none;">pengaturan akun</a> Anda.
</p>

<p style="margin: 0; color: #94a3b8; font-size: 11px; letter-spacing: 0.3px;">
&copy; {{ date('Y') }} {{ $appName }}. Hak cipta dilindungi.
</p>
<p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 11px;">
<a href="{{ $appUrl.'/legal/terms' }}" style="color: #94a3b8; text-decoration: none;">Syarat &amp; Ketentuan</a>
<span style="margin: 0 6px;">·</span>
<a href="{{ $appUrl.'/legal/privacy' }}" style="color: #94a3b8; text-decoration: none;">Kebijakan Privasi</a>
</p>

</td>
</tr>
</table>
</td>
</tr>
