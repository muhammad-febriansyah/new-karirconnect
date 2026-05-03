<?php

namespace App\Http\Controllers\Public;

use App\Enums\CompanyStatus;
use App\Enums\JobStatus;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Job;
use Illuminate\Http\Response;

/**
 * Emits an XML sitemap of public pages so search engines can crawl jobs and
 * company profiles. Limits the per-section count to keep the file under a
 * reasonable size; if the catalogue grows past ~25k entries we'd split this
 * into a sitemap index. Caching is intentionally light: crawlers hit this
 * infrequently and freshness matters.
 */
class SitemapController extends Controller
{
    private const MAX_PER_SECTION = 5000;

    public function __invoke(): Response
    {
        $urls = collect()
            ->push(['loc' => url('/'), 'changefreq' => 'daily', 'priority' => '1.0'])
            ->push(['loc' => route('public.jobs.index'), 'changefreq' => 'hourly', 'priority' => '0.9'])
            ->push(['loc' => route('public.companies.index'), 'changefreq' => 'daily', 'priority' => '0.8'])
            ->push(['loc' => route('public.salary-insight'), 'changefreq' => 'weekly', 'priority' => '0.7']);

        Job::query()
            ->where('status', JobStatus::Published)
            ->whereNotNull('published_at')
            ->latest('published_at')
            ->limit(self::MAX_PER_SECTION)
            ->get(['slug', 'updated_at'])
            ->each(function (Job $job) use ($urls): void {
                $urls->push([
                    'loc' => route('public.jobs.show', ['job' => $job->slug]),
                    'lastmod' => optional($job->updated_at)->toAtomString(),
                    'changefreq' => 'daily',
                    'priority' => '0.7',
                ]);
            });

        Company::query()
            ->where('status', CompanyStatus::Approved)
            ->latest('updated_at')
            ->limit(self::MAX_PER_SECTION)
            ->get(['slug', 'updated_at'])
            ->each(function (Company $company) use ($urls): void {
                $urls->push([
                    'loc' => route('public.companies.show', ['company' => $company->slug]),
                    'lastmod' => optional($company->updated_at)->toAtomString(),
                    'changefreq' => 'weekly',
                    'priority' => '0.6',
                ]);
            });

        $xml = $this->renderXml($urls->all());

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    /**
     * @param  array<int, array<string, string|null>>  $urls
     */
    private function renderXml(array $urls): string
    {
        $lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
        $lines[] = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach ($urls as $url) {
            $lines[] = '  <url>';
            $lines[] = '    <loc>'.htmlspecialchars($url['loc']).'</loc>';
            if (! empty($url['lastmod'])) {
                $lines[] = '    <lastmod>'.htmlspecialchars($url['lastmod']).'</lastmod>';
            }
            if (! empty($url['changefreq'])) {
                $lines[] = '    <changefreq>'.$url['changefreq'].'</changefreq>';
            }
            if (! empty($url['priority'])) {
                $lines[] = '    <priority>'.$url['priority'].'</priority>';
            }
            $lines[] = '  </url>';
        }
        $lines[] = '</urlset>';

        return implode("\n", $lines);
    }
}
