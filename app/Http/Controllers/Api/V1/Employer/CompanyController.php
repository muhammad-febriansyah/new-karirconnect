<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Enums\JobStatus;
use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\UpdateCompanyRequest;
use App\Http\Resources\Api\V1\CompanyDetailResource;
use App\Models\Application;
use App\Services\Files\FileUploadService;
use App\Services\Sanitizer\HtmlSanitizerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The employer's own company profile.
 *
 * Distinct from the public Api\V1\CompanyController: this one is not behind the
 * recruiterActive() gate, because an owner must be able to see and fix a
 * pending or suspended company -- that is exactly when they need the page.
 */
class CompanyController extends Controller
{
    use ResolvesEmployerCompany;

    public function __construct(
        private readonly FileUploadService $files,
        private readonly HtmlSanitizerService $sanitizer,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $company->load(['industry:id,name', 'size:id,name', 'province:id,name', 'city:id,name', 'offices', 'badges']);

        $subscription = $company->activeSubscription();

        return response()->json([
            'data' => new CompanyDetailResource($company),
            'meta' => [
                // The owner sees their own moderation state; the public
                // resource never exposes status.
                'status' => $company->status?->value,
                'verification_status' => $company->verification_status?->value,
                'has_recruiter_access' => $company->hasRecruiterAccess(),
                'onboarding_completed' => $company->onboarding_completed_at !== null,
                'subscription' => $subscription === null ? null : [
                    'plan' => $subscription->plan?->name,
                    'tier' => $subscription->plan?->tier?->value,
                    'status' => $subscription->status?->value,
                    'ends_at' => $subscription->ends_at?->toIso8601String(),
                    'jobs_posted_count' => $subscription->jobs_posted_count,
                    'job_post_quota' => $subscription->plan?->job_post_quota,
                ],
            ],
        ]);
    }

    public function update(UpdateCompanyRequest $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $data = $request->validated();
        $logo = $request->file('logo');
        $cover = $request->file('cover');
        unset($data['logo'], $data['cover'], $data['offices']);

        $data['slug'] ??= $company->slug;

        foreach (['about', 'culture', 'benefits'] as $field) {
            $data[$field] = $this->sanitizer->clean($data[$field] ?? null);
        }

        if ($logo) {
            $this->files->delete($company->logo_path);
            $data['logo_path'] = $this->files->storeImage($logo, 'companies/logos', 512);
        }

        if ($cover) {
            $this->files->delete($company->cover_path);
            $data['cover_path'] = $this->files->storeImage($cover, 'companies/covers', 1600);
        }

        $company->fill($data)->save();

        return response()->json([
            'data' => new CompanyDetailResource($company->fresh(['industry', 'size', 'province', 'city', 'offices', 'badges'])),
        ]);
    }

    /**
     * Headline numbers for the employer dashboard.
     */
    public function stats(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        return response()->json([
            'data' => [
                'jobs_total' => $company->jobs()->count(),
                'jobs_published' => $company->jobs()->where('status', JobStatus::Published)->count(),
                'jobs_draft' => $company->jobs()->where('status', JobStatus::Draft)->count(),
                'applications_total' => Application::query()
                    ->whereHas('job', fn ($query) => $query->where('company_id', $company->id))
                    ->count(),
                'applications_new' => Application::query()
                    ->whereHas('job', fn ($query) => $query->where('company_id', $company->id))
                    ->where('status', 'submitted')
                    ->count(),
            ],
        ]);
    }
}
