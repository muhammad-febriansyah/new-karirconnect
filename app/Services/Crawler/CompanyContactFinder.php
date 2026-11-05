<?php

namespace App\Services\Crawler;

use App\Exceptions\Crawler\CrawlerWorkerException;
use App\Jobs\FindCompanyContactJob;
use App\Models\ScrapedCompany;
use Illuminate\Support\Str;

/**
 * Looks for a company's published recruitment email on its own website
 * (worker mode "company_contact"), so applications can be forwarded without
 * an admin typing the address in.
 */
class CompanyContactFinder
{
    /**
     * Job boards and social networks are not the company's own website.
     *
     * @var list<string>
     */
    private const NOT_A_COMPANY_SITE = [
        'dealls.com', 'sejutacita.id', 'linkedin.com', 'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
        'tiktok.com', 'youtube.com', 'wa.me', 'whatsapp.com', 'google.com', 'bit.ly', 'linktr.ee',
        'greenhouse.io', 'lever.co', 'workable.com', 'jobs.lever.co',
    ];

    public function __construct(
        private readonly CrawlerClient $client,
        private readonly ScrapedCompanyUpserter $companies,
    ) {}

    /**
     * Whether the company should be searched now: it has a website of its own,
     * no recruitment email yet, and was not searched recently.
     */
    public function isDue(ScrapedCompany $company): bool
    {
        return $this->website($company) !== null
            && blank($company->recruitment_email)
            && ($company->contact_checked_at === null
                || $company->contact_checked_at->lt(now()->subDays((int) config('crawler.contact_recheck_days', 30))));
    }

    public function queueIfDue(ScrapedCompany $company): void
    {
        if (! $this->isDue($company)) {
            return;
        }

        FindCompanyContactJob::dispatch($company->id)
            ->onConnection((string) config('crawler.connection'))
            ->onQueue((string) config('crawler.queue'));
    }

    /**
     * @return array{status: string, recruitment_email: string|null, general_email: string|null}
     *
     * @throws CrawlerWorkerException
     */
    public function find(ScrapedCompany $company): array
    {
        $website = $this->website($company);
        if ($website === null) {
            return ['status' => 'skipped', 'recruitment_email' => null, 'general_email' => null];
        }

        $response = $this->client->run([
            'contract_version' => CrawlerClient::CONTRACT_VERSION,
            'mode' => 'company_contact',
            'run_uuid' => (string) Str::uuid(),
            'website' => $website,
            'user_agent' => (string) config('crawler.user_agent'),
            'respect_robots' => true,
            'timeout_s' => 60,
        ]);

        $recruitment = is_string($response['recruitment_email'] ?? null) ? $response['recruitment_email'] : null;
        $general = filter_var($response['general_email'] ?? null, FILTER_VALIDATE_EMAIL) ?: null;

        $this->companies->rememberContactEmail($company, $recruitment, $response['recruitment_email_url'] ?? null);

        $company->forceFill(array_filter([
            'contact_checked_at' => now(),
            // A general mailbox (info@) is shown on the profile, never used to forward CVs.
            'email' => blank($company->email) ? $general : null,
        ]))->save();

        return [
            'status' => (string) ($response['status'] ?? 'failed'),
            'recruitment_email' => $company->recruitment_email,
            'general_email' => $general,
        ];
    }

    private function website(ScrapedCompany $company): ?string
    {
        $url = trim((string) $company->website);
        $host = Str::lower((string) parse_url($url, PHP_URL_HOST));
        if ($host === '' || ! preg_match('#^https?://#i', $url)) {
            return null;
        }

        $blocked = [...self::NOT_A_COMPANY_SITE, ...array_keys((array) config('job_catalog.blocked_domains', []))];
        foreach ($blocked as $domain) {
            if ($host === $domain || str_ends_with($host, '.'.$domain)) {
                return null;
            }
        }

        return $url;
    }
}
