<?php

use App\Exceptions\Crawler\UnsafeUrlException;
use App\Jobs\DownloadScrapedCompanyLogoJob;
use App\Models\ScrapedCompany;
use App\Services\Crawler\CompanyLogoDownloader;
use App\Services\Crawler\DnsResolver;
use App\Services\Crawler\UrlSafetyGuard;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

const ONE_PIXEL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

beforeEach(function () {
    Storage::fake('public');

    app()->instance(DnsResolver::class, new class extends DnsResolver
    {
        public function resolve(string $host): array
        {
            return match ($host) {
                'internal.example.com' => ['192.168.1.20'],
                'metadata.example.com' => ['169.254.169.254'],
                default => ['93.184.216.34'],
            };
        }
    });

    $this->company = ScrapedCompany::factory()->create(['logo_url' => 'https://cdn.example.com/logo.png', 'logo_path' => null]);
});

it('stores a PNG logo on the public disk', function () {
    Http::fake(['cdn.example.com/*' => Http::response(base64_decode(ONE_PIXEL_PNG), 200, ['Content-Type' => 'image/png'])]);

    expect(app(CompanyLogoDownloader::class)->download($this->company))->toBeTrue();

    $this->company->refresh();
    expect($this->company->logo_path)->toStartWith('scraped-companies/logos/'.$this->company->id.'-')
        ->and($this->company->logo_path)->toEndWith('.png')
        ->and($this->company->logo_fetched_at)->not->toBeNull()
        ->and($this->company->logoUrl())->toContain('/storage/scraped-companies/logos/');
    Storage::disk('public')->assertExists($this->company->logo_path);
});

it('replaces the previous logo file', function () {
    Storage::disk('public')->put('scraped-companies/logos/old.png', 'old');
    $this->company->update(['logo_path' => 'scraped-companies/logos/old.png']);
    Http::fake(['cdn.example.com/*' => Http::response(base64_decode(ONE_PIXEL_PNG))]);

    app(CompanyLogoDownloader::class)->download($this->company);

    Storage::disk('public')->assertMissing('scraped-companies/logos/old.png');
});

it('refuses files that are not raster images', function (string $body) {
    Http::fake(['cdn.example.com/*' => Http::response($body, 200, ['Content-Type' => 'image/svg+xml'])]);

    expect(app(CompanyLogoDownloader::class)->download($this->company))->toBeFalse()
        ->and($this->company->refresh()->logo_path)->toBeNull()
        ->and($this->company->logo_fetched_at)->not->toBeNull();
})->with([
    'svg with script' => '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    'html page' => '<html><body>Not found</body></html>',
]);

it('refuses logos over the size limit', function () {
    config(['crawler.logos.max_bytes' => 10]);
    Http::fake(['cdn.example.com/*' => Http::response(base64_decode(ONE_PIXEL_PNG))]);

    expect(app(CompanyLogoDownloader::class)->download($this->company))->toBeFalse();
});

it('never fetches a logo on a private address', function (string $url) {
    Http::fake();
    $this->company->update(['logo_url' => $url]);

    expect(app(CompanyLogoDownloader::class)->download($this->company))->toBeFalse();
    Http::assertNothingSent();
})->with([
    'private dns' => 'https://internal.example.com/logo.png',
    'cloud metadata' => 'https://metadata.example.com/latest/meta-data',
    'plain http' => 'http://cdn.example.com/logo.png',
    'ip literal' => 'https://127.0.0.1/logo.png',
]);

it('checks every redirect hop', function () {
    Http::fake([
        'cdn.example.com/*' => Http::response('', 302, ['Location' => 'https://internal.example.com/logo.png']),
        'internal.example.com/*' => Http::response(base64_decode(ONE_PIXEL_PNG)),
    ]);

    expect(app(CompanyLogoDownloader::class)->download($this->company))->toBeFalse();
    Http::assertSentCount(1);
});

it('follows a safe redirect', function () {
    Http::fake([
        'cdn.example.com/logo.png' => Http::response('', 301, ['Location' => '/v2/logo.png']),
        'cdn.example.com/v2/logo.png' => Http::response(base64_decode(ONE_PIXEL_PNG)),
    ]);

    expect(app(CompanyLogoDownloader::class)->download($this->company))->toBeTrue();
});

it('runs from the queued job', function () {
    Http::fake(['cdn.example.com/*' => Http::response(base64_decode(ONE_PIXEL_PNG))]);

    (new DownloadScrapedCompanyLogoJob($this->company->id))->handle(app(CompanyLogoDownloader::class));

    expect($this->company->refresh()->logo_path)->not->toBeNull();
});

describe('UrlSafetyGuard', function () {
    it('accepts an allowlisted https host', function () {
        $result = app(UrlSafetyGuard::class)->check('https://boards-api.greenhouse.io/v1/boards/x/jobs', ['greenhouse.io']);

        expect($result['host'])->toBe('boards-api.greenhouse.io');
    });

    it('rejects unsafe urls', function (string $url, ?array $allowed) {
        app(UrlSafetyGuard::class)->check($url, $allowed);
    })->with([
        'outside allowlist' => ['https://evil.com/', ['greenhouse.io']],
        'suffix trick' => ['https://greenhouse.io.evil.com/', ['greenhouse.io']],
        'credentials' => ['https://user:pass@cdn.example.com/', null],
        'odd port' => ['https://cdn.example.com:8443/', null],
        'ipv6 literal' => ['https://[::1]/', null],
        'private dns' => ['https://internal.example.com/', null],
    ])->throws(UnsafeUrlException::class);

    it('classifies addresses', function (string $address, bool $public) {
        expect(UrlSafetyGuard::isPublicIp($address))->toBe($public);
    })->with([
        ['93.184.216.34', true],
        ['10.1.2.3', false],
        ['172.20.0.1', false],
        ['127.0.0.1', false],
        ['169.254.169.254', false],
        ['100.64.0.1', false],
        ['::1', false],
        ['fd00::1', false],
        ['::ffff:10.0.0.1', false],
        ['2606:4700:4700::1111', true],
    ]);
});
