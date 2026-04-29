<?php

namespace App\Http\Controllers\Public;

use App\Enums\CompanyStatus;
use App\Enums\JobStatus;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Industry;
use App\Models\Job;
use App\Models\Province;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyBrowseController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $industryId = $request->integer('industry_id') ?: null;
        $provinceId = $request->integer('province_id') ?: null;
        $verifiedOnly = $request->boolean('verified_only');

        $companies = Company::query()
            ->with(['industry:id,name', 'city:id,name', 'size:id,name,employee_range'])
            ->withCount(['jobs as open_jobs_count' => fn (Builder $q) => $q->where('status', JobStatus::Published)])
            ->where('status', CompanyStatus::Approved)
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->when($industryId, fn ($q) => $q->where('industry_id', $industryId))
            ->when($provinceId, fn ($q) => $q->where('province_id', $provinceId))
            ->when($verifiedOnly, fn ($q) => $q->where('verification_status', 'verified'))
            ->orderByDesc('verification_status')
            ->orderBy('name')
            ->paginate(18)
            ->withQueryString()
            ->through(fn (Company $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'tagline' => $c->tagline,
                'industry' => $c->industry?->name,
                'city' => $c->city?->name,
                'size' => $c->size ? "{$c->size->name} ({$c->size->employee_range})" : null,
                'logo_url' => $c->logo_path ? asset('storage/'.$c->logo_path) : null,
                'verification_status' => $c->verification_status?->value,
                'open_jobs_count' => $c->open_jobs_count,
            ]);

        return Inertia::render('public/companies/index', [
            'companies' => $companies,
            'filters' => [
                'search' => $search,
                'industry_id' => $industryId,
                'province_id' => $provinceId,
                'verified_only' => $verifiedOnly,
            ],
            'options' => [
                'industries' => Industry::query()->where('is_active', true)->orderBy('name')->get(['id', 'name'])
                    ->map(fn ($i) => ['value' => (string) $i->id, 'label' => $i->name])->all(),
                'provinces' => Province::query()->orderBy('name')->get(['id', 'name'])
                    ->map(fn ($p) => ['value' => (string) $p->id, 'label' => $p->name])->all(),
            ],
        ]);
    }

    public function show(Company $company): Response
    {
        abort_unless($company->status === CompanyStatus::Approved, 404);

        $company->load([
            'industry:id,name',
            'size:id,name,employee_range',
            'province:id,name',
            'city:id,name,province_id',
            'offices',
            'badges' => fn ($q) => $q->where('is_active', true),
        ]);

        $jobs = Job::query()
            ->with(['category:id,name', 'city:id,name'])
            ->where('company_id', $company->id)
            ->where('status', JobStatus::Published)
            ->orderByDesc('is_featured')
            ->orderByDesc('published_at')
            ->limit(20)
            ->get()
            ->map(fn (Job $job) => [
                'id' => $job->id,
                'slug' => $job->slug,
                'title' => $job->title,
                'category' => $job->category?->name,
                'city' => $job->city?->name,
                'employment_type' => $job->employment_type?->value,
                'work_arrangement' => $job->work_arrangement?->value,
                'salary_min' => $job->is_salary_visible ? $job->salary_min : null,
                'salary_max' => $job->is_salary_visible ? $job->salary_max : null,
                'is_salary_visible' => $job->is_salary_visible,
                'is_featured' => $job->is_featured,
                'published_at' => optional($job->published_at)->toIso8601String(),
            ]);

        return Inertia::render('public/companies/show', [
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'tagline' => $company->tagline,
                'about' => $company->about,
                'culture' => $company->culture,
                'benefits' => $company->benefits,
                'website' => $company->website,
                'industry' => $company->industry?->name,
                'size' => $company->size ? "{$company->size->name} ({$company->size->employee_range})" : null,
                'province' => $company->province?->name,
                'city' => $company->city?->name,
                'logo_url' => $company->logo_path ? asset('storage/'.$company->logo_path) : null,
                'cover_url' => $company->cover_path ? asset('storage/'.$company->cover_path) : null,
                'verification_status' => $company->verification_status?->value,
                'offices' => $company->offices->map(fn ($o) => [
                    'id' => $o->id,
                    'label' => $o->label,
                    'address' => $o->address,
                    'is_headquarter' => $o->is_headquarter,
                    'map_url' => $o->map_url,
                ]),
                'badges' => $company->badges->map(fn ($b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'tone' => $b->tone,
                ]),
            ],
            'jobs' => $jobs,
        ]);
    }
}
