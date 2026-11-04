<?php

namespace App\Services\Crawler;

use App\Jobs\DownloadScrapedCompanyLogoJob;
use App\Models\JobSource;
use App\Models\ScrapedCompany;
use App\Services\Sanitizer\HtmlSanitizerService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Str;

/**
 * Creates or updates the employer profile from the worker's `company` block.
 * Incoming values only fill or refresh fields; a missing value never wipes
 * what is already stored, and an admin's link to `companies` is kept.
 */
class ScrapedCompanyUpserter
{
    /** @var array<string, ScrapedCompany> */
    private array $resolved = [];

    public function __construct(
        private readonly HtmlSanitizerService $sanitizer,
        private readonly ListingAttributeMapper $mapper,
        private readonly DnsResolver $dns,
    ) {}

    /**
     * Use an application email that a posting publishes as the company's
     * recruitment email, when the company has none yet and the domain can
     * receive mail. An email an admin entered is never replaced.
     */
    public function rememberContactEmail(ScrapedCompany $company, ?string $email, ?string $foundOn): void
    {
        $email = filter_var($email, FILTER_VALIDATE_EMAIL) ?: null;
        if ($email === null || filled($company->recruitment_email)) {
            return;
        }

        $domain = (string) substr(strrchr($email, '@') ?: '', 1);
        if ($domain === '' || ! $this->dns->acceptsMail($domain)) {
            return;
        }

        $company->forceFill([
            'recruitment_email' => strtolower($email),
            'recruitment_email_source' => ResultValidator::isHttpUrl($foundOn) ? $foundOn : null,
            'recruitment_email_verified_at' => now(),
        ])->save();
    }

    /**
     * @param  array<string, mixed>|null  $profile  the response's `company` block
     */
    public function upsert(JobSource $source, ?array $profile, ?string $itemCompanyName = null): ScrapedCompany
    {
        $profile ??= [];
        $config = $source->config ?? [];

        $name = $this->clean($profile['name'] ?? null, 191)
            ?? $this->clean($itemCompanyName, 191)
            ?? $this->clean($config['company_name'] ?? null, 191)
            ?? $source->name;
        $domain = Str::lower($this->clean($profile['domain'] ?? null, 191) ?? '');
        $key = ScrapedCompany::normalizeName($name).'|'.$domain;

        if (isset($this->resolved[$key])) {
            return $this->resolved[$key];
        }

        $company = ScrapedCompany::query()->firstOrNew([
            'normalized_name' => ScrapedCompany::normalizeName($name),
            'domain' => $domain,
        ]);
        $previousLogoUrl = $company->logo_url;

        $company->name = $company->name ?: $name;
        $company->fill(array_filter([
            'tagline' => $this->clean($profile['tagline'] ?? null, 255),
            'about' => filled($profile['about'] ?? null) ? $this->sanitizer->clean($profile['about']) : null,
            'website' => $this->url($profile['website'] ?? ($config['company_website'] ?? null)),
            'logo_url' => $this->url($profile['logo_url'] ?? null),
            'cover_url' => $this->url($profile['cover_url'] ?? null),
            'email' => filter_var($profile['email'] ?? null, FILTER_VALIDATE_EMAIL) ?: null,
            'phone' => $this->clean($profile['phone'] ?? null, 32),
            'address' => $this->clean($profile['address'] ?? null, 1000),
            'founded_year' => $this->foundedYear($profile['founded_year'] ?? null),
            'industry_id' => $this->mapper->industryId($profile['industry_raw'] ?? null),
            'company_size_id' => $this->mapper->companySizeId($profile['size_raw'] ?? null),
            'profile_source_url' => $this->url($profile['profile_source_url'] ?? null),
        ], fn (mixed $value): bool => $value !== null && $value !== ''));

        if ($profile !== []) {
            $company->profile_fetched_at = now();
        }

        try {
            $company->save();
        } catch (UniqueConstraintViolationException) {
            // Another run created it a moment ago.
            $company = ScrapedCompany::query()
                ->where('normalized_name', ScrapedCompany::normalizeName($name))
                ->where('domain', $domain)
                ->firstOrFail();
        }

        if (filled($company->logo_url) && ($company->logo_url !== $previousLogoUrl || blank($company->logo_path))) {
            DownloadScrapedCompanyLogoJob::dispatch($company->id)
                ->onConnection((string) config('crawler.connection'))
                ->onQueue((string) config('crawler.queue'));
        }

        return $this->resolved[$key] = $company;
    }

    private function clean(mixed $value, int $max): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $text = trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5)) ?? '');

        return $text === '' ? null : Str::limit($text, $max - 3, '...');
    }

    private function url(mixed $value): ?string
    {
        return ResultValidator::isHttpUrl($value) ? $value : null;
    }

    private function foundedYear(mixed $value): ?int
    {
        return is_int($value) && $value >= 1800 && $value <= (int) now()->year ? $value : null;
    }
}
