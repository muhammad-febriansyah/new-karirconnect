@php
    try {
        $appName = (string) (app(\App\Services\Settings\SettingService::class)->get('general.app_name') ?: config('app.name'));
    } catch (\Throwable) {
        $appName = (string) config('app.name');
    }
@endphp
{{ $appName }}: {{ $url }}
