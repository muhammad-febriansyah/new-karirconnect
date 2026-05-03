<?php

namespace App\Services\Public;

use App\Enums\CompanyStatus;
use App\Enums\JobStatus;
use App\Models\CareerResource;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\EmployeeProfile;
use App\Models\Faq;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\SalarySubmission;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Builds the public homepage payload. Each section is a separate query so we
 * can cache the whole snapshot for a few minutes — landing pages get hammered
 * by crawlers and reloading users, but the data is fairly slow-moving.
 */
class HomeService
{
    private const CACHE_KEY = 'home_snapshot_v1';

    private const CACHE_TTL_SECONDS = 300;

    /**
     * @return array<string, mixed>
     */
    public function snapshot(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL_SECONDS, fn (): array => [
            'metrics' => $this->metrics(),
            'featured_jobs' => $this->featuredJobs(),
            'top_companies' => $this->topCompanies(),
            'top_categories' => $this->topCategories(),
            'salary_teasers' => $this->salaryTeasers(),
            'testimonials' => $this->testimonials(),
            'articles' => $this->articles(),
            'faqs' => $this->faqs(),
        ]);
    }

    /**
     * @return array<string, int>
     */
    private function metrics(): array
    {
        return [
            'open_jobs' => Job::query()->where('status', JobStatus::Published)->count(),
            'active_companies' => Company::query()->where('status', CompanyStatus::Approved)->count(),
            'candidates' => EmployeeProfile::query()->count(),
            'salary_reports' => SalarySubmission::query()->where('status', 'approved')->count(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function featuredJobs(): array
    {
        return Job::query()
            ->with(['company:id,name,slug,logo_path', 'category:id,name', 'city:id,name'])
            ->where('status', JobStatus::Published)
            ->whereNotNull('published_at')
            ->orderByDesc('is_featured')
            ->latest('published_at')
            ->limit(6)
            ->get()
            ->map(fn (Job $j) => [
                'slug' => $j->slug,
                'title' => $j->title,
                'company_name' => $j->company?->name,
                'company_slug' => $j->company?->slug,
                'company_logo' => $j->company?->logo_path ? asset('storage/'.$j->company->logo_path) : null,
                'category' => $j->category?->name,
                'city' => $j->city?->name,
                'employment_type' => $j->employment_type?->value,
                'work_arrangement' => $j->work_arrangement?->value,
                'salary_min' => $j->salary_min,
                'salary_max' => $j->salary_max,
                'is_featured' => (bool) $j->is_featured,
                'published_at' => optional($j->published_at)->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function topCompanies(): array
    {
        $reviewAggregates = CompanyReview::query()
            ->where('status', 'approved')
            ->selectRaw('company_id, count(*) as review_count, avg(rating) as avg_rating')
            ->groupBy('company_id')
            ->orderByRaw('count(*) desc')
            ->limit(8)
            ->get()
            ->keyBy('company_id');

        if ($reviewAggregates->isEmpty()) {
            return Company::query()
                ->where('status', CompanyStatus::Approved)
                ->withCount(['jobs as open_jobs_count' => fn ($q) => $q->where('status', JobStatus::Published)])
                ->orderByDesc('open_jobs_count')
                ->limit(6)
                ->get()
                ->map(fn (Company $c) => $this->companyRow($c, 0, null))
                ->all();
        }

        return Company::query()
            ->whereIn('id', $reviewAggregates->keys())
            ->where('status', CompanyStatus::Approved)
            ->withCount(['jobs as open_jobs_count' => fn ($q) => $q->where('status', JobStatus::Published)])
            ->get()
            ->map(fn (Company $c) => $this->companyRow(
                $c,
                (int) $reviewAggregates[$c->id]->review_count,
                round((float) $reviewAggregates[$c->id]->avg_rating, 1),
            ))
            ->sortByDesc('review_count')
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function companyRow(Company $company, int $reviewCount, ?float $avgRating): array
    {
        return [
            'slug' => $company->slug,
            'name' => $company->name,
            'logo' => $company->logo_path ? asset('storage/'.$company->logo_path) : null,
            'open_jobs' => (int) ($company->open_jobs_count ?? 0),
            'review_count' => $reviewCount,
            'avg_rating' => $avgRating,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function topCategories(): array
    {
        $counts = Job::query()
            ->where('status', JobStatus::Published)
            ->selectRaw('job_category_id, count(*) as c')
            ->whereNotNull('job_category_id')
            ->groupBy('job_category_id')
            ->orderByDesc('c')
            ->limit(8)
            ->pluck('c', 'job_category_id');

        if ($counts->isEmpty()) {
            return [];
        }

        return JobCategory::query()
            ->whereIn('id', $counts->keys())
            ->get(['id', 'name', 'slug'])
            ->map(fn (JobCategory $c) => [
                'slug' => $c->slug,
                'name' => $c->name,
                'job_count' => (int) $counts[$c->id],
            ])
            ->sortByDesc('job_count')
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function salaryTeasers(): array
    {
        return Job::query()
            ->where('status', JobStatus::Published)
            ->whereNotNull('salary_min')
            ->whereNotNull('salary_max')
            ->where('is_salary_visible', true)
            ->selectRaw('title, avg(salary_min) as p_min, avg(salary_max) as p_max, count(*) as c')
            ->groupBy('title')
            ->having('c', '>=', 2)
            ->orderByDesc('c')
            ->limit(5)
            ->get()
            ->map(fn ($row): array => [
                'title' => $row->title,
                'sample_count' => (int) $row->c,
                'salary_min' => (int) round((float) $row->p_min),
                'salary_max' => (int) round((float) $row->p_max),
            ])
            ->all();
    }

    /**
     * Approved company reviews repurposed as candidate testimonials. We pull
     * the most recent high-rated reviews so the homepage marquee stays fresh
     * without manual curation.
     *
     * @return array<int, array<string, mixed>>
     */
    private function testimonials(): array
    {
        return CompanyReview::query()
            ->with(['author:id,name', 'company:id,name'])
            ->where('status', 'approved')
            ->where('rating', '>=', 4)
            ->whereNotNull('pros')
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(fn (CompanyReview $r): array => [
                'name' => $r->is_anonymous ? 'Pengguna KarirConnect' : ($r->author?->name ?? 'Pengguna KarirConnect'),
                'role' => $r->job_title ?? 'Profesional',
                'company' => $r->company?->name ?? '-',
                'rating' => (int) $r->rating,
                'text' => Str::limit((string) $r->pros, 220),
            ])
            ->all();
    }

    /**
     * Latest published career articles for the homepage preview cards.
     *
     * @return array<int, array<string, mixed>>
     */
    private function articles(): array
    {
        return CareerResource::query()
            ->where('is_published', true)
            ->whereNotNull('published_at')
            ->latest('published_at')
            ->limit(3)
            ->get()
            ->map(fn (CareerResource $r): array => [
                'slug' => $r->slug,
                'title' => $r->title,
                'excerpt' => Str::limit((string) $r->excerpt, 140),
                'category' => $r->category,
                'thumbnail' => $r->thumbnail_path ? asset('storage/'.$r->thumbnail_path) : null,
                'reading_minutes' => (int) ($r->reading_minutes ?? 3),
                'published_at' => optional($r->published_at)->toIso8601String(),
            ])
            ->all();
    }

    /**
     * Top FAQs surfaced on the homepage accordion. Order is admin-managed
     * via the `order_number` column.
     *
     * @return array<int, array<string, mixed>>
     */
    private function faqs(): array
    {
        return Faq::query()
            ->where('is_published', true)
            ->orderBy('order_number')
            ->limit(6)
            ->get(['id', 'question', 'answer', 'category'])
            ->map(fn (Faq $f): array => [
                'id' => $f->id,
                'question' => $f->question,
                'answer' => $f->answer,
                'category' => $f->category,
            ])
            ->all();
    }
}
