<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\CompanyOfficeRequest;
use App\Models\City;
use App\Models\Company;
use App\Models\CompanyOffice;
use App\Models\Province;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CompanyOfficeController extends Controller
{
    public function index(Request $request): Response
    {
        $company = $this->resolveOwnedCompany($request);

        $offices = $company->offices()
            ->with(['province:id,name', 'city:id,name'])
            ->orderByDesc('is_headquarter')
            ->orderBy('label')
            ->get()
            ->map(fn (CompanyOffice $o) => $this->payload($o));

        return Inertia::render('employer/company-offices/index', [
            'company' => ['id' => $company->id, 'name' => $company->name],
            'offices' => $offices,
        ]);
    }

    public function create(Request $request): Response
    {
        $company = $this->resolveOwnedCompany($request);

        return Inertia::render('employer/company-offices/form', [
            'mode' => 'create',
            'company' => ['id' => $company->id, 'name' => $company->name],
            'office' => null,
            'options' => $this->options(),
        ]);
    }

    public function store(CompanyOfficeRequest $request): RedirectResponse
    {
        $company = $this->resolveOwnedCompany($request);
        $data = $request->validated();

        DB::transaction(function () use ($company, $data): void {
            if ($data['is_headquarter']) {
                $company->offices()->update(['is_headquarter' => false]);
            }
            $company->offices()->create($data);
        });

        return to_route('employer.company-offices.index')->with('success', 'Lokasi kantor ditambahkan.');
    }

    public function edit(Request $request, CompanyOffice $office): Response
    {
        $company = $this->resolveOwnedCompany($request);
        abort_unless($office->company_id === $company->id, 404);

        $office->load(['province:id,name', 'city:id,name']);

        return Inertia::render('employer/company-offices/form', [
            'mode' => 'edit',
            'company' => ['id' => $company->id, 'name' => $company->name],
            'office' => $this->payload($office),
            'options' => $this->options(),
        ]);
    }

    public function update(CompanyOfficeRequest $request, CompanyOffice $office): RedirectResponse
    {
        $company = $this->resolveOwnedCompany($request);
        abort_unless($office->company_id === $company->id, 404);

        $data = $request->validated();

        DB::transaction(function () use ($company, $office, $data): void {
            if ($data['is_headquarter']) {
                $company->offices()->where('id', '!=', $office->id)->update(['is_headquarter' => false]);
            }
            $office->update($data);
        });

        return to_route('employer.company-offices.index')->with('success', 'Lokasi kantor diperbarui.');
    }

    public function destroy(Request $request, CompanyOffice $office): RedirectResponse
    {
        $company = $this->resolveOwnedCompany($request);
        abort_unless($office->company_id === $company->id, 404);

        $office->delete();

        return to_route('employer.company-offices.index')->with('success', 'Lokasi kantor dihapus.');
    }

    private function resolveOwnedCompany(Request $request): Company
    {
        $company = Company::query()->where('owner_id', $request->user()->id)->first();
        abort_unless($company !== null, 404, 'Perusahaan belum terdaftar.');

        return $company;
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(CompanyOffice $office): array
    {
        return [
            'id' => $office->id,
            'label' => $office->label,
            'province_id' => $office->province_id,
            'city_id' => $office->city_id,
            'province' => $office->relationLoaded('province') && $office->province ? ['id' => $office->province->id, 'name' => $office->province->name] : null,
            'city' => $office->relationLoaded('city') && $office->city ? ['id' => $office->city->id, 'name' => $office->city->name] : null,
            'address' => $office->address,
            'contact_phone' => $office->contact_phone,
            'map_url' => $office->map_url,
            'is_headquarter' => $office->is_headquarter,
            'updated_at' => optional($office->updated_at)->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function options(): array
    {
        return [
            'provinces' => Province::query()->orderBy('name')->get(['id', 'name'])
                ->map(fn ($p) => ['value' => (string) $p->id, 'label' => $p->name])->all(),
            'cities' => City::query()->orderBy('name')->get(['id', 'name', 'province_id'])
                ->map(fn ($c) => ['value' => (string) $c->id, 'label' => $c->name, 'province_id' => $c->province_id])->all(),
        ];
    }
}
