<?php

namespace App\Http\Controllers\Admin;

use App\Enums\CompanyStatus;
use App\Http\Controllers\Controller;
use App\Models\Company;
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

        return Inertia::render('admin/companies/show', [
            'company' => $company,
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
