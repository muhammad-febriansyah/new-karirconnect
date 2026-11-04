<?php

namespace App\Services\ExternalJobs;

use App\Enums\JobSourceStatus;
use App\Enums\JobSourceType;
use App\Exceptions\Crawler\CrawlNotAllowedException;
use App\Exceptions\Crawler\UnsafeUrlException;
use App\Models\JobSource;
use App\Models\User;
use App\Services\Crawler\UrlSafetyGuard;
use Illuminate\Support\Str;

/**
 * Turns a catalog entry or a pasted URL into a JobSource, so the admin never
 * fills in a source form. Sources are created on first use and reused after.
 */
class ExternalSourceCatalog
{
    public const CATALOG_PREFIX = 'katalog-';

    public const URL_PREFIX = 'url-';

    public function __construct(private readonly UrlSafetyGuard $guard) {}

    /**
     * @return array<string, array<string, mixed>>
     */
    public function entries(): array
    {
        return (array) config('job_catalog.sources');
    }

    /**
     * @throws CrawlNotAllowedException
     */
    public function sourceForEntry(string $key): JobSource
    {
        $entry = $this->entries()[$key] ?? null;
        if ($entry === null) {
            throw new CrawlNotAllowedException("Sumber katalog \"{$key}\" tidak dikenal.");
        }

        return $this->upsert(self::CATALOG_PREFIX.$key, [
            'name' => $entry['name'],
            'type' => JobSourceType::from($entry['type']),
            'base_url' => $entry['base_url'],
            'allowed_domains' => $entry['allowed_domains'],
            'config' => $entry['config'],
            'permission_notes' => 'Katalog bawaan KarirConnect: '.$entry['description'].(isset($entry['warning']) ? ' '.$entry['warning'] : ''),
            'browser_allowed' => false,
            ...array_intersect_key($entry, array_flip(['max_pages', 'rate_limit_per_minute', 'schedule_minutes'])),
        ]);
    }

    /**
     * @throws CrawlNotAllowedException when the URL is unsafe or the site refuses bots
     */
    public function sourceForUrl(string $url, User $admin): JobSource
    {
        $url = trim($url);
        $parts = parse_url($url);
        $host = strtolower((string) ($parts['host'] ?? ''));
        $path = (string) ($parts['path'] ?? '/');

        foreach ((array) config('job_catalog.blocked_domains') as $domain => $reason) {
            if (UrlSafetyGuard::hostAllowed($host, [$domain])) {
                throw new CrawlNotAllowedException("{$host}: {$reason} Lowongan dari situs ini tidak bisa diambil.");
            }
        }

        try {
            $this->guard->check($url, [$host]);
        } catch (UnsafeUrlException $exception) {
            throw new CrawlNotAllowedException("{$url}: {$exception->getMessage()}");
        }

        $attributes = $this->detect($url, $host, $path);

        return $this->upsert(self::URL_PREFIX.Str::limit(Str::slug($host), 60, '').'-'.substr(sha1($url), 0, 8), [
            ...$attributes,
            'permission_notes' => "Ditambahkan lewat tempel URL oleh {$admin->name} pada ".now()->translatedFormat('d M Y H:i').'. robots.txt dan CAPTCHA dicek otomatis di setiap crawl; admin yang menambahkan bertanggung jawab atas izinnya.',
        ]);
    }

    /**
     * Work out what kind of source a pasted URL is.
     *
     * @return array<string, mixed>
     */
    private function detect(string $url, string $host, string $path): array
    {
        $segments = array_values(array_filter(explode('/', $path)));
        $pattern = (string) config('job_catalog.job_url_pattern');

        if (in_array($host, ['job-boards.greenhouse.io', 'boards.greenhouse.io'], true) && isset($segments[0])) {
            $token = $segments[0];

            return [
                'name' => Str::headline($token).' (Greenhouse)',
                'type' => JobSourceType::Greenhouse,
                'base_url' => "https://boards-api.greenhouse.io/v1/boards/{$token}/jobs",
                'allowed_domains' => ['boards-api.greenhouse.io', 'job-boards.greenhouse.io'],
                'config' => ['board_token' => $token],
                'browser_allowed' => false,
            ];
        }

        if (in_array($host, ['jobs.lever.co', 'jobs.eu.lever.co'], true) && isset($segments[0])) {
            $company = $segments[0];
            $api = $host === 'jobs.eu.lever.co' ? 'api.eu.lever.co' : 'api.lever.co';

            return [
                'name' => Str::headline($company).' (Lever)',
                'type' => JobSourceType::Lever,
                'base_url' => "https://{$api}/v0/postings/{$company}",
                'allowed_domains' => [$api, $host],
                'config' => ['company' => $company, 'company_name' => Str::headline($company)],
                'browser_allowed' => false,
            ];
        }

        if (str_ends_with($path, '.xml') || str_ends_with($path, '.xml.gz')) {
            return [
                'name' => $host.' (sitemap)',
                'type' => JobSourceType::Sitemap,
                'base_url' => $url,
                'allowed_domains' => [$host],
                'config' => ['url_pattern' => $pattern],
                'browser_allowed' => false,
            ];
        }

        // Any other page: a career page or a single job. Its JobPosting data
        // is read, and links that look like job pages are followed.
        return [
            'name' => $host,
            'type' => JobSourceType::GenericHtml,
            'base_url' => $url,
            'allowed_domains' => [$host],
            'config' => ['url_pattern' => $pattern],
            'browser_allowed' => true,
        ];
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function upsert(string $slug, array $attributes): JobSource
    {
        $source = JobSource::withTrashed()->firstOrNew(['slug' => $slug]);

        $source->fill([
            ...$attributes,
            'status' => JobSourceStatus::Active,
            'robots_checked_at' => $source->robots_checked_at ?? now(),
            // Catalog values win; otherwise keep what the source already has.
            'schedule_minutes' => $attributes['schedule_minutes'] ?? $source->schedule_minutes ?? 1440,
            'rate_limit_per_minute' => $attributes['rate_limit_per_minute'] ?? $source->rate_limit_per_minute ?? 30,
            'max_pages' => $attributes['max_pages'] ?? $source->max_pages ?? 20,
            'expected_min_items' => $source->expected_min_items ?? 0,
        ]);

        if ($source->trashed()) {
            $source->restore();
        }

        $source->save();

        return $source;
    }
}
