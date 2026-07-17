<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        @php
            $sharedApp = $page['props']['app'] ?? [];
            $sharedSeo = $page['props']['seo'] ?? [];
            $sharedBranding = $page['props']['branding'] ?? [];
            $meta = $meta ?? [];

            $appName = $sharedApp['name'] ?? config('app.name', 'Laravel');
            $metaTitle = $meta['title'] ?? $sharedSeo['meta_title'] ?? $appName;
            $metaDescription = $meta['description'] ?? $sharedSeo['meta_description'] ?? null;
            $metaKeywords = $meta['keywords'] ?? $sharedSeo['meta_keywords'] ?? null;
            $metaCanonical = $meta['canonical'] ?? url()->full();
            $metaRobots = $meta['robots'] ?? 'index,follow';
            $metaImage = $meta['image'] ?? $sharedSeo['og_image_path'] ?? $sharedBranding['logo_path'] ?? null;
            $metaSchema = $meta['schema'] ?? null;
            $metaLocale = $sharedApp['locale'] ?? app()->getLocale();
            $faviconPath = $sharedBranding['favicon_path'] ?? null;

            // Analytics is opt-in by configuration: with no Measurement ID set
            // in admin settings, nothing below renders and the browser makes no
            // request to Google at all.
            $gaMeasurementId = $sharedSeo['google_analytics_id'] ?? null;
            $gtmContainerId = $sharedSeo['google_tag_manager_id'] ?? null;
        @endphp

        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        @if ($gaMeasurementId)
            {{--
                Google Analytics 4.

                send_page_view is off here on purpose. This is an Inertia SPA, so
                only the very first load is a real document load -- every later
                navigation swaps components without a page load. Letting gtag
                send its own automatic pageview would record exactly one view per
                session and make every visitor look like they bounced. The app
                sends page_view itself on each navigation instead; see
                resources/js/lib/analytics.ts.
            --}}
            <script async src="https://www.googletagmanager.com/gtag/js?id={{ $gaMeasurementId }}"></script>
            <script>
                window.dataLayer = window.dataLayer || [];
                function gtag() { dataLayer.push(arguments); }
                gtag('js', new Date());
                gtag('config', @json($gaMeasurementId), { send_page_view: false });
            </script>
        @endif

        @if ($gtmContainerId)
            <script>
                (function (w, d, s, l, i) {
                    w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
                    var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
                    j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
                    f.parentNode.insertBefore(j, f);
                })(window, document, 'script', 'dataLayer', @json($gtmContainerId));
            </script>
        @endif
        {{-- App is light-only; opt out of Android Chrome "Auto Dark Theme" which
             otherwise lightens text inside portaled popovers (e.g. select dropdowns)
             while leaving the white background, making options invisible. --}}
        <meta name="color-scheme" content="light">

        <style>
            html {
                color-scheme: only light;
                background-color: oklch(1 0 0);
            }
        </style>

        @if ($faviconPath)
            <link rel="icon" href="{{ $faviconPath }}" sizes="any">
            <link rel="apple-touch-icon" href="{{ $faviconPath }}">
        @else
            <link rel="icon" href="/favicon.svg" type="image/svg+xml">
            <link rel="apple-touch-icon" href="/favicon.svg">
        @endif

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ $metaTitle }}</title>
            <meta data-inertia="robots" name="robots" content="{{ $metaRobots }}">
            <link data-inertia="canonical" rel="canonical" href="{{ $metaCanonical }}">

            @if ($metaDescription)
                <meta data-inertia="description" name="description" content="{{ $metaDescription }}">
                <meta data-inertia="og:description" property="og:description" content="{{ $metaDescription }}">
                <meta data-inertia="twitter:description" name="twitter:description" content="{{ $metaDescription }}">
            @endif

            @if ($metaKeywords)
                <meta data-inertia="keywords" name="keywords" content="{{ $metaKeywords }}">
            @endif

            <meta data-inertia="og:title" property="og:title" content="{{ $metaTitle }}">
            <meta data-inertia="og:type" property="og:type" content="website">
            <meta data-inertia="og:url" property="og:url" content="{{ $metaCanonical }}">
            <meta data-inertia="og:site_name" property="og:site_name" content="{{ $appName }}">
            <meta data-inertia="og:locale" property="og:locale" content="{{ str_replace('-', '_', $metaLocale) }}">
            <meta data-inertia="twitter:card" name="twitter:card" content="summary_large_image">
            <meta data-inertia="twitter:title" name="twitter:title" content="{{ $metaTitle }}">

            @if ($metaImage)
                <meta data-inertia="og:image" property="og:image" content="{{ $metaImage }}">
                <meta data-inertia="twitter:image" name="twitter:image" content="{{ $metaImage }}">
            @endif

            @if ($metaSchema)
                <script data-inertia="structured-data" type="application/ld+json">{!! \Illuminate\Support\Js::from($metaSchema) !!}</script>
            @endif
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
