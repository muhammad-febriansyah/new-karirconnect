<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * Security headers for every response (graded on securityheaders.com).
 *
 * The Content-Security-Policy allows scripts only when they carry this
 * request's nonce. Vite adds it to its own tags; the inline analytics
 * snippets in app.blade.php print it with Vite::cspNonce(). 'strict-dynamic'
 * then lets those trusted scripts load what they need (code-split chunks,
 * Google Tag Manager), so third-party hosts do not have to be listed.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = Vite::useCspNonce();

        $response = $next($request);

        header_remove('X-Powered-By');
        $response->headers->remove('X-Powered-By');

        $headers = $response->headers;
        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('X-Frame-Options', 'SAMEORIGIN');
        $headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $headers->set('Permissions-Policy', $this->permissionsPolicy());
        $headers->set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        $headers->set('X-Permitted-Cross-Domain-Policies', 'none');

        if ($request->isSecure() && config('security.hsts.enabled')) {
            $headers->set('Strict-Transport-Security', $this->hsts());
        }

        if (config('security.csp.enabled') && ! $headers->has('Content-Security-Policy')) {
            $name = config('security.csp.report_only') ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
            $headers->set($name, $this->contentSecurityPolicy($request, $nonce));
        }

        return $response;
    }

    /**
     * Camera and microphone are used by the AI interview; everything else
     * powerful is switched off.
     */
    private function permissionsPolicy(): string
    {
        return implode(', ', [
            'camera=(self)',
            'microphone=(self)',
            'fullscreen=(self)',
            'geolocation=()',
            'payment=()',
            'usb=()',
            'serial=()',
            'bluetooth=()',
            'magnetometer=()',
            'gyroscope=()',
            'accelerometer=()',
            'browsing-topics=()',
        ]);
    }

    private function hsts(): string
    {
        $value = 'max-age='.(int) config('security.hsts.max_age');

        if (config('security.hsts.include_subdomains')) {
            $value .= '; includeSubDomains';
        }
        if (config('security.hsts.preload')) {
            $value .= '; preload';
        }

        return $value;
    }

    private function contentSecurityPolicy(Request $request, string $nonce): string
    {
        // Firebase (FCM) plus the GA4 / Tag Manager endpoints Google documents
        // for CSP, including the bare analytics.google.com collect host.
        $google = [
            'https://*.googleapis.com',
            'https://*.gstatic.com',
            'https://*.google-analytics.com',
            'https://analytics.google.com',
            'https://*.analytics.google.com',
            'https://*.googletagmanager.com',
            'https://*.g.doubleclick.net',
            'https://www.google.com',
        ];
        $midtrans = ['https://*.midtrans.com'];

        $directives = [
            'default-src' => ["'self'"],
            // 'self' and https: are ignored by browsers that understand
            // 'strict-dynamic'; they only help very old browsers.
            'script-src' => ["'self'", "'nonce-{$nonce}'", "'strict-dynamic'", 'https:'],
            // React and Radix set inline style attributes, so styles stay
            // permissive. Styles cannot run code.
            'style-src' => ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            'img-src' => ["'self'", 'data:', 'blob:', 'https:'],
            'font-src' => ["'self'", 'data:', 'https://fonts.gstatic.com'],
            'connect-src' => ["'self'", ...$google],
            'media-src' => ["'self'", 'blob:', 'data:'],
            'frame-src' => ["'self'", 'https://www.google.com', 'https://maps.google.com', 'https://www.googletagmanager.com', ...$midtrans],
            'worker-src' => ["'self'", 'blob:'],
            'manifest-src' => ["'self'"],
            'object-src' => ["'none'"],
            'base-uri' => ["'self'"],
            'frame-ancestors' => ["'self'"],
            'form-action' => ["'self'", 'https://accounts.google.com', ...$midtrans],
        ];

        foreach ((array) config('security.csp.extra') as $directive => $sources) {
            if (is_string($sources) && trim($sources) !== '' && isset($directives[$directive])) {
                array_push($directives[$directive], ...array_filter(array_map('trim', explode(',', $sources))));
            }
        }

        // The Vite dev server (npm run dev) serves scripts and a websocket
        // from another origin; production builds are served from 'self'.
        if (Vite::isRunningHot()) {
            $hot = rtrim((string) file_get_contents(Vite::hotFile()));
            // CSP cannot name an IPv6 host such as http://[::1]:5173, so for
            // that case fall back to the scheme. Dev only: hot mode never
            // happens on a built production deploy.
            $origin = str_contains($hot, '[') ? 'http:' : $hot;
            $socket = str_contains($hot, '[') ? 'ws:' : preg_replace('#^http#', 'ws', $hot);
            foreach (['script-src', 'style-src', 'connect-src', 'img-src', 'font-src'] as $directive) {
                $directives[$directive][] = $origin;
            }
            $directives['connect-src'][] = $socket;
        }

        $policy = collect($directives)
            ->map(fn (array $sources, string $directive): string => $directive.' '.implode(' ', array_unique($sources)))
            ->values()
            ->all();

        if ($request->isSecure()) {
            $policy[] = 'upgrade-insecure-requests';
        }
        if (filled(config('security.csp.report_uri'))) {
            $policy[] = 'report-uri '.config('security.csp.report_uri');
        }

        return implode('; ', $policy);
    }
}
