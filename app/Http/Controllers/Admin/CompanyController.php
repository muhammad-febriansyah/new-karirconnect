<?php

namespace App\Http\Controllers\Admin;

use App\Enums\CompanyStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCompanyAccountRequest;
use App\Models\Company;
use App\Models\CompanySize;
use App\Models\Industry;
use App\Services\Company\CompanyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyController extends Controller
{
    public function __construct(private readonly CompanyService $companies) {}

    public function index(Request $request): Response
    {
        $statusFilter = $request->string('status')->toString();
        $search = $request->string('search')->toString();

        $companies = Company::query()
            ->with(['owner:id,name,email'])
            ->withCount('members')
            ->when($statusFilter !== '', fn ($q) => $q->where('status', $statusFilter))
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/companies/index', [
            'companies' => $companies,
            'filters' => [
                'status' => $statusFilter,
                'search' => $search,
            ],
            'statusOptions' => CompanyStatus::selectItems(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/companies/create', [
            'industries' => Industry::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']),
            'companySizes' => CompanySize::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'employee_range']),
        ]);
    }

    public function store(StoreCompanyAccountRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $company = $this->companies->createByAdmin(
            ownerData: [
                'name' => $data['owner_name'],
                'email' => $data['owner_email'],
                'password' => $data['password'],
                'phone' => $data['owner_phone'] ?? null,
            ],
            companyData: array_filter([
                'name' => $data['name'],
                'website' => $data['website'] ?? null,
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'industry_id' => $data['industry_id'] ?? null,
                'company_size_id' => $data['company_size_id'] ?? null,
            ], fn ($value) => $value !== null),
            admin: $request->user(),
            verified: $data['mark_verified'] ?? true,
        );

        return to_route('admin.companies.show', $company)
            ->with('success', "Akun perusahaan {$company->name} berhasil dibuat.");
    }

    public function show(Company $company): Response
    {
        $company->load([
            'owner:id,name,email',
            'members.user:id,name,email',
            'verifications' => fn ($q) => $q->latest('id'),
            'industry:id,name',
            'size:id,name,employee_range',
            'city:id,name,province_id',
            'city.province:id,name',
            'offices.city:id,name,province_id',
            'offices.province:id,name',
            'badges:id,company_id,code,name,description,tone,is_active,awarded_at',
        ]);

        $subscription = $company->activeSubscription()?->loadMissing('plan:id,name,slug,job_post_quota');

        return Inertia::render('admin/companies/show', [
            'company' => $company,
            'logoUrl' => $company->logo_path ? asset('storage/'.$company->logo_path) : null,
            'subscription' => $subscription === null ? null : [
                'plan_name' => $subscription->plan?->name,
                'plan_slug' => $subscription->plan?->slug,
                'status' => $subscription->status->value,
                'starts_at' => $subscription->starts_at,
                'ends_at' => $subscription->ends_at,
                'jobs_posted_count' => $subscription->jobs_posted_count,
                'job_post_quota' => $subscription->plan?->job_post_quota,
            ],
        ]);
    }

    public function approve(Company $company, Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $this->companies->approve($company, $request->user());

        return back()->with('success', "{$company->name} telah disetujui.");
    }

    public function suspend(Company $company, Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $this->companies->suspend($company);

        return back()->with('success', "{$company->name} telah di-nonaktifkan.");
    }
}
