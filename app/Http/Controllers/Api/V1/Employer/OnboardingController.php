<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\OnboardingProfileRequest;
use App\Http\Requests\Employer\UploadVerificationDocumentRequest;
use App\Http\Resources\Api\V1\CompanyDetailResource;
use App\Models\Company;
use App\Services\Billing\BillingService;
use App\Services\Company\CompanyService;
use App\Services\Company\CompanyVerificationService;
use App\Services\Files\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Employer onboarding.
 *
 * Must stay OUTSIDE the employer.onboarded gate: every other employer endpoint
 * 403s with employer_onboarding_required until onboarding_completed_at is set,
 * so without these the mobile client has no way to satisfy the gate and a
 * newly registered employer is locked out for good.
 */
class OnboardingController extends Controller
{
    public function __construct(
        private readonly CompanyService $companies,
        private readonly CompanyVerificationService $verifications,
        private readonly FileUploadService $files,
        private readonly BillingService $billing,
    ) {}

    /**
     * Current onboarding state.
     */
    public function show(Request $request): JsonResponse
    {
        $company = $this->ensureCompany($request);

        $company->load([
            'industry:id,name',
            'size:id,name',
            'province:id,name',
            'city:id,name',
            'verifications' => fn ($query) => $query->latest('id'),
        ]);

        return response()->json([
            'data' => new CompanyDetailResource($company),
            'meta' => [
                'completed' => $company->onboarding_completed_at !== null,
                'status' => $company->status?->value,
                'verification_status' => $company->verification_status?->value,
                'documents' => $company->verifications->map(fn ($doc) => [
                    'id' => $doc->id,
                    'document_type' => $doc->document_type,
                    'status' => $doc->status,
                    'created_at' => $doc->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }

    public function updateProfile(OnboardingProfileRequest $request): JsonResponse
    {
        $company = $this->ensureCompany($request);

        $data = $request->validated();

        if ($request->hasFile('logo')) {
            $this->files->delete($company->logo_path);
            $data['logo_path'] = $this->files->storeImage($request->file('logo'), 'company-logos', 512);
        }

        unset($data['logo']);

        $company->fill($data)->save();

        return response()->json([
            'data' => new CompanyDetailResource($company->fresh(['industry', 'size', 'province', 'city'])),
        ]);
    }

    public function uploadDocument(UploadVerificationDocumentRequest $request): JsonResponse
    {
        $company = $this->ensureCompany($request);

        $document = $this->verifications->upload(
            $company,
            $request->user(),
            $request->validated('document_type'),
            $request->file('file'),
        );

        return response()->json([
            'message' => 'Dokumen diunggah dan menunggu review admin.',
            'data' => ['id' => $document->id, 'status' => $document->status],
        ], 201);
    }

    /**
     * Mark onboarding complete, which is what opens the rest of the employer
     * API. Also grants the free trial, matching the web.
     */
    public function finish(Request $request): JsonResponse
    {
        $company = $this->ensureCompany($request);

        if ($company->onboarding_completed_at === null) {
            $company->forceFill(['onboarding_completed_at' => now()])->save();
        }

        // No-ops when the trial was already used or a subscription is active.
        $subscription = $this->billing->grantTrial($company);

        return response()->json([
            'message' => 'Onboarding selesai.',
            'data' => [
                'completed' => true,
                'trial_granted' => $subscription !== null,
            ],
        ]);
    }

    /**
     * Mirrors the web: an employer who somehow has no company row gets one
     * rather than a 404, so onboarding always has something to edit.
     */
    private function ensureCompany(Request $request): Company
    {
        $user = $request->user();

        return Company::query()->where('owner_id', $user->id)->first()
            ?? $this->companies->register($user, ['name' => $user->name."'s Company"]);
    }
}
