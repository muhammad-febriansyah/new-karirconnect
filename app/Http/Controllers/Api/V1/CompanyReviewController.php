<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\CompanyReviewRequest;
use App\Http\Resources\Api\V1\CompanyReviewResource;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\ReviewHelpfulVote;
use App\Services\Reviews\ReviewModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class CompanyReviewController extends Controller
{
    public function __construct(private readonly ReviewModerationService $moderation) {}

    /**
     * Published reviews for a company. Public.
     */
    public function index(Request $request, Company $company): JsonResponse
    {
        abort_unless($company->hasRecruiterAccess(), 404);

        $reviews = CompanyReview::query()
            ->with('author:id,name,avatar_path')
            ->where('company_id', $company->id)
            ->where('status', ReviewStatus::Approved)
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 10, 50))
            ->withQueryString();

        $approved = CompanyReview::query()
            ->where('company_id', $company->id)
            ->where('status', ReviewStatus::Approved);

        return response()->json([
            'data' => CompanyReviewResource::collection($reviews->items()),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'total' => $reviews->total(),
                'stats' => [
                    'total' => (clone $approved)->count(),
                    'avg_rating' => round((float) (clone $approved)->avg('rating'), 2),
                ],
                'voted_review_ids' => $this->votedIds($request),
            ],
        ]);
    }

    /**
     * Reviews I have written, in any state, so the author can see that a
     * review is still pending moderation.
     */
    public function mine(Request $request): JsonResponse
    {
        $reviews = CompanyReview::query()
            ->with(['company:id,name,slug,logo_path', 'author:id,name,avatar_path'])
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($reviews->items())->map(fn (CompanyReview $review) => [
                ...(new CompanyReviewResource($review))->toArray($request),
                'status' => $review->status?->value,
                'company' => [
                    'id' => $review->company?->id,
                    'name' => $review->company?->name,
                    'slug' => $review->company?->slug,
                ],
            ]),
            'meta' => ['total' => $reviews->total()],
        ]);
    }

    public function store(CompanyReviewRequest $request, Company $company): JsonResponse
    {
        try {
            $review = $this->moderation->submit($request->user(), $company, $request->validated());
        } catch (RuntimeException $e) {
            // The service rejects duplicates and other business rules this way.
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'review_rejected',
            ], 422);
        }

        return response()->json([
            'message' => 'Review terkirim. Akan ditinjau sebelum dipublikasikan.',
            'data' => new CompanyReviewResource($review->fresh('author')),
        ], 201);
    }

    public function update(CompanyReviewRequest $request, CompanyReview $review): JsonResponse
    {
        abort_unless($review->user_id === $request->user()->id, 403);

        // Editing sends it back through moderation: an approved review must not
        // be quietly rewritten into something nobody reviewed.
        $review->fill($request->validated())
            ->forceFill(['status' => ReviewStatus::Pending])
            ->save();

        return response()->json(['data' => new CompanyReviewResource($review->fresh('author'))]);
    }

    public function destroy(Request $request, CompanyReview $review): JsonResponse
    {
        abort_unless($review->user_id === $request->user()->id, 403);

        $review->delete();

        return response()->json(['message' => 'Review dihapus.']);
    }

    /**
     * Mark a review helpful. Idempotent.
     */
    public function helpful(Request $request, CompanyReview $review): JsonResponse
    {
        abort_unless($review->status === ReviewStatus::Approved, 404);

        ReviewHelpfulVote::query()->firstOrCreate([
            'review_id' => $review->id,
            'user_id' => $request->user()->id,
        ]);

        $this->moderation->refreshHelpfulCount($review);

        return response()->json([
            'data' => ['helpful_count' => $review->fresh()->helpful_count, 'has_voted' => true],
        ]);
    }

    public function unhelpful(Request $request, CompanyReview $review): JsonResponse
    {
        ReviewHelpfulVote::query()
            ->where('review_id', $review->id)
            ->where('user_id', $request->user()->id)
            ->delete();

        $this->moderation->refreshHelpfulCount($review);

        return response()->json([
            'data' => ['helpful_count' => $review->fresh()->helpful_count, 'has_voted' => false],
        ]);
    }

    /**
     * @return array<int, int>
     */
    private function votedIds(Request $request): array
    {
        $userId = $request->user()?->id;

        if ($userId === null) {
            return [];
        }

        return ReviewHelpfulVote::query()->where('user_id', $userId)->pluck('review_id')->all();
    }
}
