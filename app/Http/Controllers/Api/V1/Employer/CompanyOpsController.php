<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Enums\OrderStatus;
use App\Enums\ReviewStatus;
use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\UploadVerificationDocumentRequest;
use App\Http\Resources\Api\V1\CompanyReviewResource;
use App\Models\CompanyReview;
use App\Models\Job;
use App\Services\Billing\BillingService;
use App\Services\Company\CompanyVerificationService;
use App\Services\Reviews\ReviewModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Employer operations that do not warrant a controller each: verification
 * documents, job boosts, and responding to reviews.
 */
class CompanyOpsController extends Controller
{
    use ResolvesEmployerCompany;

    /**
     * Mirrors Employer\JobBoostController. Kept in sync by hand because the web
     * controller holds them as private constants.
     */
    private const BOOST_PRICE_IDR = 199000;

    private const BOOST_DAYS = 30;

    public function __construct(
        private readonly CompanyVerificationService $verifications,
        private readonly BillingService $billing,
        private readonly ReviewModerationService $moderation,
    ) {}

    /**
     * Verification documents this company has submitted.
     */
    public function verifications(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $documents = $company->verifications()
            ->latest('id')
            ->get()
            ->map(fn ($doc) => [
                'id' => $doc->id,
                'document_type' => $doc->document_type,
                'status' => $doc->status,
                'review_note' => $doc->review_note,
                'created_at' => $doc->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => $documents,
            'meta' => ['verification_status' => $company->verification_status?->value],
        ]);
    }

    public function uploadVerification(UploadVerificationDocumentRequest $request): JsonResponse
    {
        $company = $this->requireCompany($request);

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
     * Buy featured placement for a job.
     *
     * Returns the payment URL rather than redirecting. is_featured is only set
     * once the Midtrans webhook confirms payment (BillingService::applyJobBoost)
     * -- never by this call, and never by the client.
     */
    public function boostJob(Request $request, Job $job): JsonResponse
    {
        $this->authorizeJob($request, $job);

        $company = $this->requireCompany($request);

        try {
            $order = $this->billing->checkoutJobBoost(
                $company,
                $request->user(),
                $job,
                self::BOOST_PRICE_IDR,
                self::BOOST_DAYS,
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'boost_failed'], 422);
        }

        return response()->json([
            'data' => [
                'reference' => $order->reference,
                'status' => $order->status?->value,
                'amount_idr' => $order->amount_idr,
                'payment_url' => $order->payment_url,
                'requires_payment' => $order->status === OrderStatus::AwaitingPayment,
                'days' => self::BOOST_DAYS,
            ],
        ], 201);
    }

    /**
     * Reviews written about this company.
     */
    public function reviews(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $reviews = CompanyReview::query()
            ->with('author:id,name,avatar_path')
            ->where('company_id', $company->id)
            ->where('status', ReviewStatus::Approved)
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => CompanyReviewResource::collection($reviews->items()),
            'meta' => ['total' => $reviews->total()],
        ]);
    }

    /**
     * Publish the company's reply to a review.
     */
    public function respondToReview(Request $request, CompanyReview $review): JsonResponse
    {
        $company = $this->requireCompany($request);

        abort_unless($review->company_id === $company->id, 403);

        $data = $request->validate([
            'response_body' => ['required', 'string', 'max:2000'],
        ]);

        $this->moderation->respond($review, $request->user(), $data['response_body']);

        return response()->json([
            'data' => new CompanyReviewResource($review->fresh('author')),
        ]);
    }
}
