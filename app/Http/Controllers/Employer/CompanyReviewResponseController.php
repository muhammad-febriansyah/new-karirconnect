<?php

namespace App\Http\Controllers\Employer;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Services\Reviews\ReviewModerationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyReviewResponseController extends Controller
{
    public function __construct(private readonly ReviewModerationService $moderation) {}

    public function index(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $reviews = CompanyReview::query()
            ->with('author:id,name,avatar_path')
            ->where('company_id', $company->id)
            ->where('status', ReviewStatus::Approved)
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('employer/company-reviews/index', [
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
                'created_at' => optional($r->created_at)->toIso8601String(),
            ]),
        ]);
    }

    public function respond(Request $request, CompanyReview $review): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null && $review->company_id === $company->id, 403);

        $data = $request->validate([
            'response_body' => ['required', 'string', 'max:2000'],
        ]);

        $this->moderation->respond($review, $request->user(), $data['response_body']);

        return back()->with('success', 'Tanggapan terkirim.');
    }

    private function resolveCompany(Request $request): ?Company
    {
        return Company::query()->where('owner_id', $request->user()->id)->first();
    }
}
