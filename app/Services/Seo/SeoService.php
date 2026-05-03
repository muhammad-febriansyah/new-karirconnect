<?php

namespace App\Services\Seo;

use App\Models\Job;
use App\Services\Settings\SettingService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SeoService
{
    public function __construct(private readonly SettingService $settings) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function home(): array
    {
        $defaults = $this->defaults();

        return $this->make(
            title: $defaults['app_name'],
            description: $defaults['description'] ?: 'Temukan lowongan kerja terbaik di Indonesia, insight gaji, dan tools AI untuk mempercepat perjalanan karier Anda.',
            canonical: route('home'),
            robots: 'index,follow',
            keywords: $defaults['keywords'],
            image: $defaults['image'],
            schema: [
                '@context' => 'https://schema.org',
                '@type' => 'WebSite',
                'name' => $defaults['app_name'],
                'url' => route('home'),
                'description' => $defaults['description'] ?: 'Platform karier Indonesia untuk lowongan kerja, insight gaji, dan dukungan AI.',
                'potentialAction' => [
                    '@type' => 'SearchAction',
                    'target' => route('public.jobs.index').'?search={search_term_string}',
                    'query-input' => 'required name=search_term_string',
                ],
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function jobIndex(Request $request, array $filters, int $total): array
    {
        $defaults = $this->defaults();
        $search = trim((string) ($filters['search'] ?? ''));
        $hasFilters = $this->hasActiveFilters($filters);
        $title = $search !== '' ? "Lowongan {$search}" : 'Lowongan Kerja';
        $description = $search !== ''
            ? "Temukan lowongan {$search} terbaru di KarirConnect. Saat ini ada {$total} posisi yang cocok untuk kata kunci Anda."
            : "Jelajahi lowongan kerja terbaru dari perusahaan terverifikasi di Indonesia. Saat ini tersedia {$total} lowongan aktif di KarirConnect.";

        return $this->make(
            title: $title,
            description: $description,
            canonical: route('public.jobs.index'),
            robots: $hasFilters ? 'noindex,follow' : 'index,follow',
            keywords: $defaults['keywords'],
            image: $defaults['image'],
            schema: [
                '@context' => 'https://schema.org',
                '@type' => 'CollectionPage',
                'name' => $this->formatTitle($title),
                'url' => $request->fullUrl(),
                'description' => $description,
                'isPartOf' => [
                    '@type' => 'WebSite',
                    'name' => $defaults['app_name'],
                    'url' => route('home'),
                ],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jobShow(Job $job): array
    {
        $defaults = $this->defaults();
        $companyName = $job->is_anonymous ? 'Perusahaan Konfidensial' : (string) $job->company?->name;
        $location = collect([$job->city?->name, $job->province?->name])->filter()->implode(', ');
        $salaryText = $this->salaryText($job);
        $descriptionParts = array_filter([
            $companyName,
            $location !== '' ? $location : null,
            $salaryText,
            $this->plainText($job->description),
        ]);
        $description = Str::limit(implode(' · ', $descriptionParts), 160, '');

        return $this->make(
            title: (string) $job->title,
            description: $description !== '' ? $description : 'Lihat detail lowongan kerja terbaru di KarirConnect.',
            canonical: route('public.jobs.show', ['job' => $job->slug]),
            robots: 'index,follow',
            keywords: $defaults['keywords'],
            image: $job->company?->logo_path ? asset('storage/'.$job->company->logo_path) : $defaults['image'],
            schema: array_filter([
                '@context' => 'https://schema.org',
                '@type' => 'JobPosting',
                'title' => $job->title,
                'description' => $this->plainText($job->description),
                'datePosted' => optional($job->published_at)->toDateString(),
                'validThrough' => optional($job->application_deadline)->toDateString(),
                'employmentType' => $job->employment_type?->value,
                'hiringOrganization' => [
                    '@type' => 'Organization',
                    'name' => $companyName,
                    'sameAs' => $job->is_anonymous ? null : $job->company?->website,
                    'logo' => $job->company?->logo_path ? asset('storage/'.$job->company->logo_path) : $defaults['image'],
                ],
                'jobLocation' => $location !== '' ? [
                    '@type' => 'Place',
                    'address' => [
                        '@type' => 'PostalAddress',
                        'addressLocality' => $job->city?->name,
                        'addressRegion' => $job->province?->name,
                        'addressCountry' => 'ID',
                    ],
                ] : null,
                'baseSalary' => $job->is_salary_visible && $job->salary_min ? [
                    '@type' => 'MonetaryAmount',
                    'currency' => 'IDR',
                    'value' => [
                        '@type' => 'QuantitativeValue',
                        'minValue' => $job->salary_min,
                        'maxValue' => $job->salary_max ?: $job->salary_min,
                        'unitText' => 'MONTH',
                    ],
                ] : null,
            ]),
        );
    }

    /**
     * @return array{app_name: string, description: string, keywords: string|null, image: string|null}
     */
    private function defaults(): array
    {
        $public = $this->settings->publicByGroup();

        return [
            'app_name' => (string) ($public['general']['app_name'] ?? config('app.name')),
            'description' => (string) ($public['seo']['meta_description'] ?? ''),
            'keywords' => $public['seo']['meta_keywords'] ?? null,
            'image' => $this->assetUrl($public['seo']['og_image_path'] ?? $public['branding']['logo_path'] ?? null),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function make(
        string $title,
        string $description,
        string $canonical,
        string $robots,
        ?string $keywords = null,
        ?string $image = null,
        ?array $schema = null,
    ): array {
        return [
            'title' => $this->formatTitle($title),
            'description' => Str::limit(trim($description), 160, ''),
            'canonical' => $canonical,
            'robots' => $robots,
            'keywords' => $keywords,
            'image' => $image,
            'schema' => $schema,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function hasActiveFilters(array $filters): bool
    {
        foreach ($filters as $key => $value) {
            if ($key === 'sort' && $value === 'latest') {
                continue;
            }

            if (blank($value)) {
                continue;
            }

            if (is_array($value) && $value === []) {
                continue;
            }

            return true;
        }

        return false;
    }

    private function formatTitle(string $title): string
    {
        $appName = $this->defaults()['app_name'];

        if ($title === $appName || str_contains($title, " - {$appName}")) {
            return $title;
        }

        return "{$title} - {$appName}";
    }

    private function plainText(?string $html): string
    {
        return trim((string) Str::of(strip_tags((string) $html))->squish());
    }

    private function assetUrl(mixed $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        return asset('storage/'.$path);
    }

    private function salaryText(Job $job): ?string
    {
        if (! $job->is_salary_visible || ! $job->salary_min) {
            return null;
        }

        $formatter = new \NumberFormatter('id_ID', \NumberFormatter::CURRENCY);
        $formatter->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, 0);

        $minimum = $formatter->formatCurrency($job->salary_min, 'IDR');
        $maximum = $job->salary_max ? $formatter->formatCurrency($job->salary_max, 'IDR') : null;

        return $maximum && $maximum !== $minimum ? "{$minimum} - {$maximum} per bulan" : "{$minimum} per bulan";
    }
}
