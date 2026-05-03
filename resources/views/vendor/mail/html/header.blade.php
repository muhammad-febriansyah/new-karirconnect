@props(['url'])
@php
    try {
        $settings = app(\App\Services\Settings\SettingService::class);
        $logoPath = $settings->get('branding.logo_path');
        $appName = (string) ($settings->get('general.app_name') ?: config('app.name'));
    } catch (\Throwable) {
        $logoPath = null;
        $appName = (string) config('app.name');
    }
    $logoUrl = $logoPath ? asset('storage/'.ltrim((string) $logoPath, '/')) : null;
@endphp
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block; text-decoration: none;">
@if ($logoUrl)
<img src="{{ $logoUrl }}" alt="{{ $appName }}" style="display: block; height: 56px; max-height: 56px; width: auto; margin: 0 auto;">
@else
<span style="display: inline-block; padding: 12px 20px; border-radius: 12px; background: linear-gradient(135deg, #1d70d8 0%, #28b0d4 100%); color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.4px; text-decoration: none;">
{{ $appName }}
</span>
@endif
</a>
</td>
</tr>
