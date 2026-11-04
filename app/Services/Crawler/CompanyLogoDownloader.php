<?php

namespace App\Services\Crawler;

use App\Exceptions\Crawler\UnsafeUrlException;
use App\Models\ScrapedCompany;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Copies a scraped company's logo onto our own disk.
 *
 * Logos live on CDNs that are not in the source allowlist, so any public
 * https host is accepted, but every hop is checked by the SSRF guard and the
 * connection is pinned to the address that was checked (no DNS rebinding).
 * Only raster images are kept; SVG is refused because it can carry script.
 */
class CompanyLogoDownloader
{
    private const MAX_REDIRECTS = 3;

    private const MAX_DIMENSION = 4096;

    /** @var array<int, string> */
    private const ALLOWED_TYPES = [
        IMAGETYPE_PNG => 'png',
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_GIF => 'gif',
        IMAGETYPE_WEBP => 'webp',
    ];

    public function __construct(private readonly UrlSafetyGuard $guard) {}

    /**
     * @return bool true when a logo file is now stored
     *
     * @throws ConnectionException on network errors (the job may retry)
     */
    public function download(ScrapedCompany $company): bool
    {
        if (blank($company->logo_url)) {
            return false;
        }

        try {
            $body = $this->fetch($company->logo_url);
            $extension = $this->imageExtension($body);
        } catch (UnsafeUrlException|RuntimeException $exception) {
            Log::warning('Scraped company logo skipped', [
                'scraped_company_id' => $company->id,
                'url' => $company->logo_url,
                'reason' => $exception->getMessage(),
            ]);
            $company->forceFill(['logo_fetched_at' => now()])->save();

            return false;
        }

        $disk = Storage::disk((string) config('crawler.logos.disk'));
        $path = sprintf(
            '%s/%d-%s.%s',
            trim((string) config('crawler.logos.directory'), '/'),
            $company->id,
            substr(sha1($body), 0, 12),
            $extension,
        );

        $disk->put($path, $body);

        if (filled($company->logo_path) && $company->logo_path !== $path) {
            $disk->delete($company->logo_path);
        }

        $company->forceFill(['logo_path' => $path, 'logo_fetched_at' => now()])->save();

        return true;
    }

    private function fetch(string $url): string
    {
        $maxBytes = (int) config('crawler.logos.max_bytes');

        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            ['host' => $host, 'addresses' => $addresses] = $this->guard->check($url);
            $pinned = str_contains($addresses[0], ':') ? "[{$addresses[0]}]" : $addresses[0];

            $response = Http::withOptions([
                'allow_redirects' => false,
                'curl' => [CURLOPT_RESOLVE => ["{$host}:443:{$pinned}"]],
            ])
                ->withUserAgent((string) config('crawler.user_agent'))
                ->accept('image/png,image/jpeg,image/gif,image/webp')
                ->timeout((int) config('crawler.logos.timeout_seconds'))
                ->get($url);

            if ($response->redirect()) {
                $location = $response->header('Location');
                if ($location === '') {
                    throw new RuntimeException('redirect without Location');
                }
                $url = $this->resolveRedirect($url, $location);

                continue;
            }

            if (! $response->successful()) {
                throw new RuntimeException("HTTP {$response->status()}");
            }

            $declared = (int) $response->header('Content-Length');
            $body = $response->body();
            if ($declared > $maxBytes || strlen($body) > $maxBytes) {
                throw new RuntimeException('logo is larger than the size limit');
            }

            return $body;
        }

        throw new RuntimeException('too many redirects');
    }

    private function imageExtension(string $body): string
    {
        $info = @getimagesizefromstring($body);
        if ($info === false || ! isset(self::ALLOWED_TYPES[$info[2]])) {
            throw new RuntimeException('not a PNG, JPEG, GIF or WebP image');
        }
        if ($info[0] < 1 || $info[1] < 1 || $info[0] > self::MAX_DIMENSION || $info[1] > self::MAX_DIMENSION) {
            throw new RuntimeException('image dimensions out of range');
        }

        return self::ALLOWED_TYPES[$info[2]];
    }

    private function resolveRedirect(string $from, string $location): string
    {
        if (preg_match('#^https?://#i', $location) === 1) {
            return $location;
        }

        $parts = parse_url($from);
        $origin = "{$parts['scheme']}://{$parts['host']}";

        if (str_starts_with($location, '//')) {
            return "{$parts['scheme']}:{$location}";
        }
        if (str_starts_with($location, '/')) {
            return $origin.$location;
        }

        $directory = rtrim(dirname($parts['path'] ?? '/'), '/');

        return "{$origin}{$directory}/{$location}";
    }
}
