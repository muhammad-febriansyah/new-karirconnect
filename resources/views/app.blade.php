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
        @endphp

        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <style>
            html {
                background-color: oklch(1 0 0);
            }
        </style>

        @if ($faviconPath)
            <link rel="icon" href="{{ $faviconPath }}" sizes="any">
            <link rel="apple-touch-icon" href="{{ $faviconPath }}">
        @else
            <link rel="icon" href="/favicon.ico" sizes="any">
            <link rel="icon" href="/favicon.svg" type="image/svg+xml">
            <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        @endif

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

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
