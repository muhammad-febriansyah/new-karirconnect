<?php

use App\Models\User;
use App\Services\Settings\SettingService;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Vite;

it('sends the security headers securityheaders.com grades', function () {
    $response = $this->get('/');

    $response->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
        ->assertHeaderMissing('X-Powered-By');

    expect($response->headers->get('Permissions-Policy'))
        ->toContain('camera=(self)')
        ->toContain('microphone=(self)')
        ->toContain('geolocation=()');
});

it('only allows scripts carrying this request nonce', function () {
    $response = $this->get('/');
    $csp = $response->headers->get('Content-Security-Policy');
    $nonce = Vite::cspNonce();

    expect($nonce)->not->toBeEmpty()
        ->and($csp)->toContain("script-src 'self' 'nonce-{$nonce}' 'strict-dynamic'")
        ->and($csp)->not->toContain("'unsafe-eval'")
        ->and($csp)->toContain("object-src 'none'")
        ->and($csp)->toContain("frame-ancestors 'self'")
        ->and($csp)->toContain("base-uri 'self'");

    // script-src itself never allows inline code.
    preg_match('/script-src ([^;]+)/', $csp, $scriptSrc);
    expect($scriptSrc[1])->not->toContain("'unsafe-inline'");
});

it('uses a fresh nonce per request', function () {
    $first = $this->get('/')->headers->get('Content-Security-Policy');
    $second = $this->get('/')->headers->get('Content-Security-Policy');

    preg_match("/'nonce-([^']+)'/", $first, $a);
    preg_match("/'nonce-([^']+)'/", $second, $b);

    expect($a[1])->not->toBe($b[1]);
});

it('prints the nonce on the analytics snippets', function () {
    $this->seed(SettingSeeder::class);
    app(SettingService::class)->set('seo', 'google_analytics_id', 'G-TEST123');
    app(SettingService::class)->set('seo', 'google_tag_manager_id', 'GTM-TEST1');

    $response = $this->get('/');
    preg_match("/'nonce-([^']+)'/", $response->headers->get('Content-Security-Policy'), $nonce);
    $html = $response->getContent();

    expect($html)->toContain('G-TEST123')
        ->and($html)->toContain('GTM-TEST1')
        ->and(substr_count($html, 'nonce="'.$nonce[1].'"'))->toBeGreaterThanOrEqual(3);
});

it('sends HSTS only over https', function () {
    expect($this->get('/')->headers->has('Strict-Transport-Security'))->toBeFalse();

    $this->get('https://localhost/')
        ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

it('adds upgrade-insecure-requests only over https', function () {
    expect($this->get('/')->headers->get('Content-Security-Policy'))->not->toContain('upgrade-insecure-requests');
    expect($this->get('https://localhost/')->headers->get('Content-Security-Policy'))->toContain('upgrade-insecure-requests');
});

it('can run the policy in report-only mode', function () {
    config(['security.csp.report_only' => true, 'security.csp.report_uri' => 'https://report.example.com/csp']);

    $response = $this->get('/');

    expect($response->headers->has('Content-Security-Policy'))->toBeFalse()
        ->and($response->headers->get('Content-Security-Policy-Report-Only'))->toContain('report-uri https://report.example.com/csp');
});

it('applies to authenticated pages and the JSON API too', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get('/admin/scraper')->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    $this->getJson('/up')->assertHeader('X-Content-Type-Options', 'nosniff');
});
