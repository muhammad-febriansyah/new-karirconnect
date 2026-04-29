<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\RegisterCompanyRequest;
use App\Http\Requests\Employer\UpdateCompanyRequest;
use App\Models\City;
use App\Models\Company;
use App\Models\CompanySize;
use App\Models\Industry;
use App\Models\Province;
use App\Services\Company\CompanyService;
use App\Services\Files\FileUploadService;
use App\Services\Sanitizer\HtmlSanitizerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyProfileController extends Controller
{
    public function __construct(
        private readonly CompanyService $companies,
        private readonly FileUploadService $files,
        private readonly HtmlSanitizerService $sanitizer,
    ) {}

    public function edit(Request $request): Response
    {
        $company = $this->resolveCompany($request)
            ?->load([
                'industry:id,name',
                'size:id,name,employee_range',
                'province:id,name',
                'city:id,name,province_id',
                'offices.city:id,name,province_id',
                'offices.province:id,name',
                'badges:id,company_id,code,name,description,tone,is_active,awarded_at',
            ]);

        return Inertia::render('employer/company/edit', [
            'company' => $company ? [
                'id' => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'tagline' => $company->tagline,
                'logo_url' => $company->logo_path ? asset('storage/'.$company->logo_path) : null,
                'cover_url' => $company->cover_path ? asset('storage/'.$company->cover_path) : null,
                'website' => $company->website,
                'email' => $company->email,
                'phone' => $company->phone,
                'industry_id' => $company->industry_id,
                'company_size_id' => $company->company_size_id,
                'founded_year' => $company->founded_year,
                'province_id' => $company->province_id,
                'city_id' => $company->city_id,
                'address' => $company->address,
                'about' => $company->about,
                'culture' => $company->culture,
                'benefits' => $company->benefits,
                'status' => $company->status?->value,
                'verification_status' => $company->verification_status?->value,
                'offices' => $company->offices->map(fn ($office) => [
                    'id' => $office->id,
                    'label' => $office->label,
                    'province_id' => $office->province_id,
                    'city_id' => $office->city_id,
                    'address' => $office->address,
                    'contact_phone' => $office->contact_phone,
                    'map_url' => $office->map_url,
                    'is_headquarter' => $office->is_headquarter,
                ])->values(),
                'badges' => $company->badges->map(fn ($badge) => [
                    'id' => $badge->id,
                    'code' => $badge->code,
                    'name' => $badge->name,
                    'description' => $badge->description,
                    'tone' => $badge->tone,
                    'is_active' => $badge->is_active,
                ])->values(),
            ] : null,
            'options' => [
                'industries' => Industry::query()->where('is_active', true)->orderBy('name')->get(['id', 'name'])
                    ->map(fn ($i) => ['value' => (string) $i->id, 'label' => $i->name])->all(),
                'company_sizes' => CompanySize::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'employee_range'])
                    ->map(fn ($s) => ['value' => (string) $s->id, 'label' => $s->name.' ('.$s->employee_range.')'])->all(),
                'provinces' => Province::query()->orderBy('name')->get(['id', 'name'])
                    ->map(fn ($p) => ['value' => (string) $p->id, 'label' => $p->name])->all(),
                'cities' => City::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'province_id'])
                    ->map(fn ($c) => ['value' => (string) $c->id, 'label' => $c->name, 'province_id' => $c->province_id])->all(),
            ],
        ]);
    }

    public function store(RegisterCompanyRequest $request): RedirectResponse
    {
        if ($this->resolveCompany($request)) {
            return back()->with('error', 'Anda sudah memiliki perusahaan.');
        }

        $this->companies->register($request->user(), $request->validated());

        return back()->with('success', 'Perusahaan berhasil didaftarkan dan menunggu persetujuan admin.');
    }

    public function update(UpdateCompanyRequest $request): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $data = $request->validated();
        $logo = $request->file('logo');
        $cover = $request->file('cover');
        $offices = $data['offices'] ?? [];
        unset($data['logo'], $data['cover']);
        unset($data['offices']);

        $data['slug'] ??= $company->slug;
        $data['about'] = $this->sanitizer->clean($data['about'] ?? null);
        $data['culture'] = $this->sanitizer->clean($data['culture'] ?? null);
        $data['benefits'] = $this->sanitizer->clean($data['benefits'] ?? null);

        if ($logo) {
            $this->files->delete($company->logo_path);
            $data['logo_path'] = $this->files->storeImage($logo, 'companies/logos', 512);
        }
        if ($cover) {
            $this->files->delete($company->cover_path);
            $data['cover_path'] = $this->files->storeImage($cover, 'companies/covers', 1600);
        }

        $company->fill($data)->save();
        $this->syncOffices($company, $offices);

        return back()->with('success', 'Profil perusahaan berhasil diperbarui.');
    }

    private function resolveCompany(Request $request): ?Company
    {
        return Company::query()
            ->where('owner_id', $request->user()->id)
            ->first();
    }

    /**
     * @param  array<int, array<string, mixed>>  $offices
     */
    private function syncOffices(Company $company, array $offices): void
    {
        $existingIds = $company->offices()->pluck('id');
        $retainedIds = collect($offices)
            ->pluck('id')
            ->filter()
            ->map(fn (mixed $id) => (int) $id);

        $company->offices()
            ->whereIn('id', $existingIds->diff($retainedIds))
            ->delete();

        $headquarterAssigned = false;

        foreach ($offices as $office) {
            $isHeadquarter = (bool) ($office['is_headquarter'] ?? false);

            if ($isHeadquarter && ! $headquarterAssigned) {
                $headquarterAssigned = true;
            } else {
                $isHeadquarter = false;
            }

            $payload = [
                'label' => $office['label'],
                'province_id' => $office['province_id'] ?? null,
                'city_id' => $office['city_id'] ?? null,
                'address' => $office['address'] ?? null,
                'contact_phone' => $office['contact_phone'] ?? null,
                'map_url' => $office['map_url'] ?? null,
                'is_headquarter' => $isHeadquarter,
            ];

            $officeId = $office['id'] ?? null;

            if ($officeId) {
                $company->offices()
                    ->whereKey($officeId)
                    ->update($payload);

                continue;
            }

            $company->offices()->create($payload);
        }

        if (! $headquarterAssigned && $company->offices()->exists()) {
            $firstOffice = $company->offices()->oldest('id')->first();
            $firstOffice?->forceFill(['is_headquarter' => true])->save();
        }
    }
}
