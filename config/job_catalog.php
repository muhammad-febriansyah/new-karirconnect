<?php

/*
|--------------------------------------------------------------------------
| Jobs Eksternal: built-in sources
|--------------------------------------------------------------------------
|
| Ready-made sources for the "Scrap" dialog, so an admin never has to fill
| in a source form. Every entry was checked on 2026-11-04: an official ATS
| job-board API, or a feed that publishes an API for re-sharing its jobs.
| "rules" are that feed's own terms and are enforced on the public job page.
|
| Platforms that refuse automated access (robots.txt, CAPTCHA wall or their
| terms) are in "blocked_domains" and cannot be added by pasting a URL.
|
*/

$indonesia = ['Indonesia', 'Jakarta', 'Bandung', 'Surabaya', 'Bali', 'Yogyakarta', 'Medan', 'Tangerang', 'Bekasi', 'Depok', 'Semarang', 'Malang'];

$greenhouse = fn (string $token): array => [
    'type' => 'greenhouse',
    'base_url' => "https://boards-api.greenhouse.io/v1/boards/{$token}/jobs",
    'allowed_domains' => ['boards-api.greenhouse.io', 'job-boards.greenhouse.io'],
];

$lever = fn (string $company): array => [
    'type' => 'lever',
    'base_url' => "https://api.lever.co/v0/postings/{$company}",
    'allowed_domains' => ['api.lever.co', 'jobs.lever.co'],
];

return [

    /*
    | Keep only postings located in Indonesia (city/province in the master
    | data, "Indonesia" or the ID country code). Remote "Worldwide" jobs and
    | jobs abroad are dropped for every source.
    */
    'indonesia_only' => (bool) env('EXTERNAL_JOBS_INDONESIA_ONLY', true),

    'sources' => [
        'xendit' => [
            // Hidden from the Scrap dialog on request; kept so existing
            // sources keep their settings. Set to false to show it again.
            'hidden' => true,
            'name' => 'Xendit',
            'group' => 'Perusahaan (lowongan Indonesia)',
            'description' => 'Fintech pembayaran. Board Greenhouse resmi, disaring ke lokasi Indonesia.',
            ...$greenhouse('xendit'),
            'config' => ['board_token' => 'xendit', 'company_name' => 'Xendit', 'location_keywords' => $indonesia],
            'default_selected' => true,
        ],
        'ninjavan' => [
            // Hidden from the Scrap dialog on request; kept so existing
            // sources keep their settings. Set to false to show it again.
            'hidden' => true,
            'name' => 'Ninja Van',
            'group' => 'Perusahaan (lowongan Indonesia)',
            'description' => 'Logistik. Board Lever resmi, disaring ke lokasi Indonesia.',
            ...$lever('ninjavan'),
            'config' => ['company' => 'ninjavan', 'company_name' => 'Ninja Van', 'location_keywords' => $indonesia],
            'default_selected' => true,
        ],
        'binance' => [
            // Hidden from the Scrap dialog on request; kept so existing
            // sources keep their settings. Set to false to show it again.
            'hidden' => true,
            'name' => 'Binance',
            'group' => 'Perusahaan (lowongan Indonesia)',
            'description' => 'Exchange kripto. Board Greenhouse resmi, disaring ke lokasi Indonesia.',
            ...$greenhouse('binance'),
            'config' => ['board_token' => 'binance', 'company_name' => 'Binance', 'location_keywords' => $indonesia],
            'default_selected' => false,
        ],
        'okx' => [
            // Hidden from the Scrap dialog on request; kept so existing
            // sources keep their settings. Set to false to show it again.
            'hidden' => true,
            'name' => 'OKX',
            'group' => 'Perusahaan (lowongan Indonesia)',
            'description' => 'Exchange kripto. Board Greenhouse resmi, disaring ke lokasi Indonesia.',
            ...$greenhouse('okx'),
            'config' => ['board_token' => 'okx', 'company_name' => 'OKX', 'location_keywords' => $indonesia],
            'default_selected' => false,
        ],
        'dealls' => [
            'name' => 'Dealls',
            'group' => 'Job board Indonesia',
            'default_selected' => true,
            'description' => 'Ribuan lowongan Indonesia, dibaca dari sitemap dan data JobPosting di tiap halaman (robots.txt Dealls mengizinkan).',
            // Terms of Dealls claim database rights over its content and do not
            // grant re-publishing. Allowed technically, but ask Dealls for
            // permission before relying on it.
            'warning' => 'Status izin abu-abu: syarat layanan Dealls mengklaim hak atas basis data. Sebaiknya minta izin atau kerja sama ke Dealls.',
            'type' => 'sitemap',
            'base_url' => 'https://dealls.com/sitemap-dynamic.xml',
            'allowed_domains' => ['dealls.com'],
            'config' => [
                // Job pages only: /loker/<title>~<company>. Category pages
                // (/loker/posisi/...) and the /en/ duplicates are skipped.
                'url_pattern' => '^https://dealls\\.com/loker/[^/?#~]+~[^/?#]+$',
                'rules' => ['attribution' => ['name' => 'Dealls', 'url' => 'https://dealls.com']],
            ],
            // One request per second, 150 job pages per run (fits the 300 s run
            // limit), every two hours; unread pages first, so all job pages
            // are covered in about a day and refreshed after that.
            'max_pages' => 150,
            'rate_limit_per_minute' => 60,
            'schedule_minutes' => 120,
        ],
        'jobicy-apac' => [
            'name' => 'Jobicy (remote Asia-Pasifik)',
            'group' => 'Feed lowongan remote',
            'description' => 'Lowongan remote Asia-Pasifik; hanya yang lokasinya menyebut Indonesia yang disimpan.',
            'type' => 'job_feed',
            'base_url' => 'https://jobicy.com/api/v2/remote-jobs',
            'allowed_domains' => ['jobicy.com'],
            'config' => [
                'feed' => 'jobicy',
                'params' => ['geo' => 'apac'],
                // "Please ensure Jobicy is clearly credited with a direct link to
                // the source, and all application buttons redirect to the
                // original job URL."
                'rules' => ['attribution' => ['name' => 'Jobicy', 'url' => 'https://jobicy.com'], 'apply_external_only' => true],
            ],
            'default_selected' => false,
        ],
        'remoteok' => [
            'name' => 'Remote OK',
            'group' => 'Feed lowongan remote',
            'description' => 'Lowongan remote global; hanya yang lokasinya menyebut Indonesia yang disimpan.',
            'type' => 'job_feed',
            'base_url' => 'https://remoteok.com/api',
            'allowed_domains' => ['remoteok.com'],
            'config' => [
                'feed' => 'remoteok',
                // "Please link back (with follow, and without nofollow!) to the
                // URL on Remote OK and mention Remote OK as a source." The
                // Remote OK logo itself may not be used.
                'rules' => ['attribution' => ['name' => 'Remote OK', 'url' => 'https://remoteok.com'], 'apply_external_only' => true],
            ],
            'default_selected' => false,
        ],
        'himalayas' => [
            'name' => 'Himalayas',
            'group' => 'Feed lowongan remote',
            'description' => 'Lowongan remote global; hanya yang lokasinya menyebut Indonesia yang disimpan.',
            'type' => 'job_feed',
            'base_url' => 'https://himalayas.app/jobs/api',
            'allowed_domains' => ['himalayas.app'],
            'config' => [
                'feed' => 'himalayas',
                'rules' => ['attribution' => ['name' => 'Himalayas', 'url' => 'https://himalayas.app'], 'apply_external_only' => true],
            ],
            'default_selected' => false,
        ],
        'remotive' => [
            'name' => 'Remotive',
            'group' => 'Feed lowongan remote',
            'description' => 'Lowongan remote; hanya yang lokasinya menyebut Indonesia yang disimpan. Tidak diteruskan ke Google Jobs sesuai syarat Remotive.',
            'type' => 'job_feed',
            'base_url' => 'https://remotive.com/api/remote-jobs',
            'allowed_domains' => ['remotive.com'],
            'config' => [
                'feed' => 'remotive',
                // "Please do not submit Remotive jobs to third Party websites,
                // including ... Google Jobs. Please link back ... AND mention
                // Remotive as a source."
                'rules' => ['attribution' => ['name' => 'Remotive', 'url' => 'https://remotive.com'], 'apply_external_only' => true, 'no_structured_data' => true],
            ],
            'default_selected' => false,
        ],
    ],

    /*
    | Refuse these when pasted: their robots.txt, bot wall or terms forbid
    | automated collection (checked 2026-11-04).
    */
    'blocked_domains' => [
        'glints.com' => 'Glints memblokir trafik otomatis dengan CAPTCHA.',
        'kalibrr.com' => 'Syarat layanan Kalibrr melarang scraping dan ekstraksi otomatis.',
        'jobstreet.com' => 'robots.txt JobStreet melarang crawler membuka halaman lowongan.',
        'jobstreet.co.id' => 'robots.txt JobStreet melarang crawler membuka halaman lowongan.',
        'indeed.com' => 'robots.txt Indeed melarang crawler membuka halaman lowongan.',
        'linkedin.com' => 'LinkedIn melarang scraping di syarat layanannya dan robots.txt.',
        'jora.com' => 'robots.txt Jora melarang semua halaman untuk crawler.',
        'kitalulus.com' => 'robots.txt KitaLulus melarang semua halaman untuk crawler.',
        'loker.id' => 'Loker.id memblokir akses bot.',
    ],

    // Followed on pasted career pages and sitemaps: links that look like a
    // single job (Python regular expression).
    'job_url_pattern' => '(?i)/(jobs?|careers?|karir|karier|lowongan|loker|vacanc(?:y|ies)|positions?|openings?)/[^/?#]+',

];
