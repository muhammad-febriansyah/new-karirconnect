<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\OnboardingProfileRequest;
use App\Http\Requests\Employer\UploadVerificationDocumentRequest;
use App\Models\City;
use App\Models\Company;
use App\Models\CompanySize;
use App\Models\CompanyVerification;
use App\Models\Industry;
use App\Models\Province;
use App\Services\Company\CompanyService;
use App\Services\Company\CompanyVerificationService;
use App\Services\Files\FileUploadService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function __construct(
        private readonly CompanyService $companies,
        private readonly CompanyVerificationService $verifications,
        private readonly FileUploadService $files,
    ) {}

    public function edit(Request $request): Response
    {
        $company = $this->ensureCompany($request);
        $company->load(['verifications' => fn ($q) => $q->latest('id')]);

        return Inertia::render('employer/onboarding', [
            'user' => [
                'name' => $request->user()->name,
                'email' => $request->user()->email,
            ],
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'tagline' => $company->tagline,
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
                'logo_url' => $company->logo_path ? asset('storage/'.$company->logo_path) : null,
                'status' => $company->status?->value,
                'verification_status' => $company->verification_status?->value,
                'onboarding_completed_at' => optional($company->onboarding_completed_at)->toIso8601String(),
                'documents' => $company->verifications->map(fn (CompanyVerification $v): array => [
                    'id' => $v->id,
                    'document_type' => $v->document_type,
                    'original_name' => $v->original_name,
                    'status' => is_object($v->status) ? $v->status->value : $v->status,
                    'uploaded_at' => optional($v->created_at)->toIso8601String(),
                    'file_url' => $v->file_path ? asset('storage/'.$v->file_path) : null,
                ])->values(),
            ],
            'options' => [
                'industries' => Industry::query()
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->map(fn (Industry $i): array => ['value' => (string) $i->id, 'label' => $i->name])
                    ->all(),
                'company_sizes' => CompanySize::query()
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->get(['id', 'name', 'employee_range'])
                    ->map(fn (CompanySize $s): array => [
                        'value' => (string) $s->id,
                        'label' => $s->name.' ('.$s->employee_range.')',
                    ])
                    ->all(),
                'provinces' => Province::query()
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->map(fn (Province $p): array => ['value' => (string) $p->id, 'label' => $p->name])
                    ->all(),
                'cities' => City::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'province_id'])
                    ->map(fn (City $c): array => [
                        'value' => (string) $c->id,
                        'label' => $c->name,
                        'province_id' => $c->province_id,
                    ])
                    ->all(),
                'document_types' => [
                    ['value' => 'nib', 'label' => 'NIB (Nomor Induk Berusaha)'],
                    ['value' => 'siup', 'label' => 'SIUP'],
                    ['value' => 'akta', 'label' => 'Akta Pendirian'],
                    ['value' => 'npwp', 'label' => 'NPWP'],
                    ['value' => 'tdp', 'label' => 'TDP'],
                    ['value' => 'other', 'label' => 'Lainnya'],
                ],
            ],
        ]);
    }

    public function updateProfile(OnboardingProfileRequest $request): RedirectResponse
    {
        $company = $this->ensureCompany($request);
        $data = $request->validated();

        if ($request->hasFile('logo')) {
            $this->files->delete($company->logo_path);
            $data['logo_path'] = $this->files->storeImage($request->file('logo'), 'company-logos', 512);
        }

        unset($data['logo']);

        $company->fill($data)->save();

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Profil perusahaan tersimpan.',
        ]);
    }

    public function uploadDocument(UploadVerificationDocumentRequest $request): RedirectResponse
    {
        $company = $this->ensureCompany($request);

        $this->verifications->upload(
            $company,
            $request->user(),
            $request->validated('document_type'),
            $request->file('file'),
        );

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Dokumen berhasil diunggah dan menunggu review admin.',
        ]);
    }

    public function finish(Request $request): RedirectResponse
    {
        $company = $this->ensureCompany($request);

        if ($company->onboarding_completed_at === null) {
            $company->forceFill(['onboarding_completed_at' => now()])->save();
        }

        return to_route('dashboard')->with('toast', [
            'type' => 'success',
            'message' => 'Onboarding selesai. Tim kami akan review profil & dokumen perusahaan Anda.',
        ]);
    }

    private function ensureCompany(Request $request): Company
    {
        $user = $request->user();
        $company = Company::query()->where('owner_id', $user->id)->first();

        if ($company === null) {
            $company = $this->companies->register($user, ['name' => $user->name."'s Company"]);
        }

        return $company;
    }
}
