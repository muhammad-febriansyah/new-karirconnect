<?php

namespace App\Http\Controllers\Public;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\ReviewHelpfulVote;
use App\Services\Reviews\ReviewModerationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyReviewController extends Controller
{
    public function __construct(private readonly ReviewModerationService $moderation) {}

    public function index(Request $request, Company $company): Response
    {
        $reviews = CompanyReview::query()
            ->with('author:id,name,avatar_path')
            ->where('company_id', $company->id)
            ->where('status', ReviewStatus::Approved)
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        $stats = [
            'total' => CompanyReview::query()->where('company_id', $company->id)->where('status', ReviewStatus::Approved)->count(),
            'avg_rating' => round((float) CompanyReview::query()
                ->where('company_id', $company->id)
                ->where('status', ReviewStatus::Approved)
                ->avg('rating'), 2),
            'recommend_pct' => $this->recommendPct($company),
        ];

        $userId = $request->user()?->id;
        $votedIds = $userId
            ? ReviewHelpfulVote::query()->where('user_id', $userId)->pluck('review_id')->all()
            : [];

        return Inertia::render('public/company-reviews', [
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'logo_path' => $company->logo_path ? asset('storage/'.$company->logo_path) : null,
            ],
            'stats' => $stats,
            'reviews' => $reviews->through(fn (CompanyReview $r) => [
                'id' => $r->id,
                'title' => $r->title,
                'rating' => $r->rating,
                'pros' => $r->pros,
                'cons' => $r->cons,
                'advice_to_management' => $r->advice_to_management,
                'employment_status' => $r->employment_status,
                'job_title' => $r->job_title,
                'would_recommend' => $r->would_recommend,
                'is_anonymous' => $r->is_anonymous,
                'author_name' => $r->is_anonymous ? null : $r->author?->name,
                'response_body' => $r->response_body,
                'responded_at' => optional($r->responded_at)->toIso8601String(),
                'helpful_count' => $r->helpful_count,
                'has_voted' => in_array($r->id, $votedIds, true),
                'created_at' => optional($r->created_at)->toIso8601String(),
            ]),
        ]);
    }

    public function helpful(Request $request, CompanyReview $review): RedirectResponse
    {
        abort_unless($review->status === ReviewStatus::Approved, 403);
        $userId = $request->user()->id;

        $existing = ReviewHelpfulVote::query()
            ->where('review_id', $review->id)
            ->where('user_id', $userId)
            ->first();

        if ($existing) {
            $existing->delete();
        } else {
            ReviewHelpfulVote::query()->create(['review_id' => $review->id, 'user_id' => $userId]);
        }

        $this->moderation->refreshHelpfulCount($review);

        return back();
    }

    private function recommendPct(Company $company): int
    {
        $total = CompanyReview::query()
            ->where('company_id', $company->id)
            ->where('status', ReviewStatus::Approved)
            ->count();

        if ($total === 0) {
            return 0;
        }

        $recommend = CompanyReview::query()
            ->where('company_id', $company->id)
            ->where('status', ReviewStatus::Approved)
            ->where('would_recommend', true)
            ->count();

        return (int) round(($recommend / $total) * 100);
    }
}
