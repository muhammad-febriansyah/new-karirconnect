<?php

return [

    /*
    |--------------------------------------------------------------------------
    | HTTP security headers (App\Http\Middleware\SecurityHeaders)
    |--------------------------------------------------------------------------
    |
    | Tuned to score A+ on securityheaders.com without breaking the app:
    | scripts run only with a per-request nonce ('strict-dynamic'), so no
    | 'unsafe-inline' or 'unsafe-eval' for scripts.
    |
    */

    'csp' => [
        'enabled' => (bool) env('SECURITY_CSP_ENABLED', true),

        // Roll out with report-only first if a new third-party script is added.
        'report_only' => (bool) env('SECURITY_CSP_REPORT_ONLY', false),

        'report_uri' => env('SECURITY_CSP_REPORT_URI'),

        /*
        | Extra sources per directive, comma separated in .env, e.g.
        | SECURITY_CSP_CONNECT_SRC="https://api.example.com"
        */
        'extra' => [
            'connect-src' => env('SECURITY_CSP_CONNECT_SRC'),
            'img-src' => env('SECURITY_CSP_IMG_SRC'),
            'frame-src' => env('SECURITY_CSP_FRAME_SRC'),
            'form-action' => env('SECURITY_CSP_FORM_ACTION'),
        ],
    ],

    'hsts' => [
        // Only ever sent over HTTPS; browsers ignore it on plain HTTP anyway.
        'enabled' => (bool) env('SECURITY_HSTS_ENABLED', true),
        'max_age' => (int) env('SECURITY_HSTS_MAX_AGE', 31536000),
        // Off by default: one subdomain without HTTPS (e.g. a mail host) would
        // become unreachable in browsers that saw the header.
        'include_subdomains' => (bool) env('SECURITY_HSTS_INCLUDE_SUBDOMAINS', false),
        // Only enable once every subdomain serves HTTPS: preload is hard to undo.
        'preload' => (bool) env('SECURITY_HSTS_PRELOAD', false),
    ],

];
