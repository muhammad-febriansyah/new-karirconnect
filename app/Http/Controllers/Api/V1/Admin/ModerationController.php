<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\CompanyStatus;
use App\Enums\CompanyVerificationStatus;
use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReportReviewRequest;
use App\Http\Requests\Admin\ReviewVerificationRequest;
use App\Http\Resources\Api\V1\CompanyResource;
use App\Http\Resources\Api\V1\CompanyReviewResource;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\CompanyVerification;
use App\Models\Report;
use App\Services\Company\CompanyService;
use App\Services\Company\CompanyVerificationService;
use App\Services\Reviews\ReviewModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin moderation: approving companies, reviewing verification documents,
 * moderating reviews, and handling reports.
 *
 * Every route is behind role:admin, which also re-checks is_active against the
 * database rather than trusting the token's claim.
 */
class ModerationController extends Controller
{
    public function __construct(
        private readonly CompanyService $companies,
        private readonly CompanyVerificationService $verifications,
        private readonly ReviewModerationService $reviews,
    ) {}

    /**
     * All companies, in any state -- this is the moderation queue, so unlike
     * the public listing it is not filtered by recruiterActive().
     */
    public function companies(Request $request): JsonResponse
    {
        $companies = Company::query()
            ->with(['industry:id,name', 'city:id,name', 'size:id,name', 'owner:id,name,email'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('verification_status'), fn ($query) => $query->where('verification_status', $request->string('verification_status')->toString()))
            ->when($request->filled('search'), fn ($query) => $query->where('name', 'like', '%'.$request->string('search')->toString().'%'))
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($companies->items())->map(fn (Company $company) => [
                ...(new CompanyResource($company))->toArray($request),
                'status' => $company->status?->value,
                'verification_status' => $company->verification_status?->value,
                'owner' => ['id' => $company->owner?->id, 'name' => $company->owner?->name, 'email' => $company->owner?->email],
                'created_at' => $company->created_at?->toIso8601String(),
            ])->values(),
            'meta' => [
                'total' => $companies->total(),
                'current_page' => $companies->currentPage(),
                'last_page' => $companies->lastPage(),
                'counts' => [
                    'pending' => Company::query()->where('status', CompanyStatus::Pending)->count(),
                    'approved' => Company::query()->where('status', CompanyStatus::Approved)->count(),
                    'suspended' => Company::query()->where('status', CompanyStatus::Suspended)->count(),
                ],
            ],
        ]);
    }

    public function approveCompany(Request $request, Company $company): JsonResponse
    {
        $this->companies->approve($company, $request->user());

        return response()->json([
            'message' => 'Perusahaan disetujui.',
            'data' => ['status' => $company->fresh()->status?->value],
        ]);
    }

    public function suspendCompany(Request $request, Company $company): JsonResponse
    {
        $this->companies->suspend($company);

        return response()->json([
            'message' => 'Perusahaan dinonaktifkan.',
            'data' => ['status' => $company->fresh()->status?->value],
        ]);
    }

    /**
     * Verification documents awaiting review.
     */
    public function verifications(Request $request): JsonResponse
    {
        $verifications = CompanyVerification::query()
            ->with(['company:id,name,slug', 'uploadedBy:id,name'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($verifications->items())->map(fn (CompanyVerification $row) => [
                'id' => $row->id,
                'company' => ['id' => $row->company?->id, 'name' => $row->company?->name],
                'document_type' => $row->document_type,
                'status' => $row->status,
                'file_url' => $row->file_path ? asset('storage/'.$row->file_path) : null,
                'uploaded_by' => $row->uploadedBy?->name,
                'created_at' => $row->created_at?->toIso8601String(),
            ])->values(),
            'meta' => [
                'total' => $verifications->total(),
                'pending' => CompanyVerification::query()->where('status', 'pending')->count(),
            ],
        ]);
    }

    public function reviewVerification(ReviewVerificationRequest $request, CompanyVerification $verification): JsonResponse
    {
        $decision = $request->validated('decision');
        $note = $request->validated('note');

        $decision === 'approve'
            ? $this->verifications->approve($verification, $request->user(), $note)
            : $this->verifications->reject($verification, $request->user(), $note);

        return response()->json([
            'message' => $decision === 'approve' ? 'Dokumen disetujui.' : 'Dokumen ditolak.',
            'data' => [
                'status' => $verification->fresh()->status,
                'company_verification_status' => $verification->company?->fresh()->verification_status?->value,
            ],
        ]);
    }

    /**
     * The review moderation queue. Defaults to pending, which is the whole
     * point of the screen.
     */
    public function reviews(Request $request): JsonResponse
    {
        $reviews = CompanyReview::query()
            ->with(['company:id,name,slug', 'author:id,name,avatar_path'])
            ->where('status', $request->string('status')->toString() ?: ReviewStatus::Pending->value)
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($reviews->items())->map(fn (CompanyReview $review) => [
                ...(new CompanyReviewResource($review))->toArray($request),
                'status' => $review->status?->value,
                'company' => ['id' => $review->company?->id, 'name' => $review->company?->name],
            ])->values(),
            'meta' => [
                'total' => $reviews->total(),
                'pending' => CompanyReview::query()->where('status', ReviewStatus::Pending)->count(),
            ],
        ]);
    }

    public function approveReview(Request $request, CompanyReview $review): JsonResponse
    {
        $data = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        $this->reviews->approve($review, $request->user(), $data['note'] ?? null);

        return response()->json(['message' => 'Review disetujui.', 'data' => ['status' => $review->fresh()->status?->value]]);
    }

    public function rejectReview(Request $request, CompanyReview $review): JsonResponse
    {
        $data = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        $this->reviews->reject($review, $request->user(), $data['note'] ?? null);

        return response()->json(['message' => 'Review ditolak.', 'data' => ['status' => $review->fresh()->status?->value]]);
    }

    /**
     * User-submitted reports (abuse, spam) against any reportable model.
     */
    public function reports(Request $request): JsonResponse
    {
        $reports = Report::query()
            ->with(['reporter:id,name', 'reviewer:id,name', 'reportable'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($reports->items())->map(fn (Report $report) => [
                'id' => $report->id,
                'reason' => $report->reason,
                'description' => $report->description,
                'status' => $report->status,
                'reporter' => $report->reporter?->name,
                'reviewer' => $report->reviewer?->name,
                'reportable_type' => class_basename($report->reportable_type),
                'reportable_id' => $report->reportable_id,
                'created_at' => $report->created_at?->toIso8601String(),
            ])->values(),
            'meta' => ['total' => $reports->total()],
        ]);
    }

    public function reviewReport(ReportReviewRequest $request, Report $report): JsonResponse
    {
        $report->update([
            'status' => $request->validated('status'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json(['message' => 'Laporan diperbarui.', 'data' => ['status' => $report->status]]);
    }

    /**
     * Companies still waiting on verification, for a badge count.
     */
    public function queueCounts(): JsonResponse
    {
        return response()->json([
            'data' => [
                'companies_pending' => Company::query()->where('status', CompanyStatus::Pending)->count(),
                'verifications_pending' => CompanyVerification::query()->where('status', 'pending')->count(),
                'reviews_pending' => CompanyReview::query()->where('status', ReviewStatus::Pending)->count(),
                // 'pending' is the migration default and the only state an
                // unreviewed report is ever in; ReportReviewRequest allows just
                // 'reviewed' and 'dismissed'. There is no 'open'.
                'reports_pending' => Report::query()->where('status', 'pending')->count(),
                'companies_unverified' => Company::query()
                    ->where('verification_status', CompanyVerificationStatus::Pending)
                    ->count(),
            ],
        ]);
    }
}
