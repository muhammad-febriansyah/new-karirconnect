<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Models\CompanyReview;
use App\Services\Reviews\ReviewModerationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReviewModerationController extends Controller
{
    public function __construct(private readonly ReviewModerationService $moderation) {}

    public function index(Request $request): Response
    {
        $status = $request->input('status', 'pending');
        $statusEnum = ReviewStatus::tryFrom($status) ?? ReviewStatus::Pending;

        $reviews = CompanyReview::query()
            ->with(['company:id,name,slug', 'author:id,name,email'])
            ->where('status', $statusEnum)
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/reviews/index', [
            'status' => $statusEnum->value,
            'reviews' => $reviews->through(fn (CompanyReview $r) => [
                'id' => $r->id,
                'title' => $r->title,
                'rating' => $r->rating,
                'pros' => $r->pros,
                'cons' => $r->cons,
                'company_name' => $r->company?->name,
                'company_slug' => $r->company?->slug,
                'author_name' => $r->author?->name,
                'author_email' => $r->author?->email,
                'employment_status' => $r->employment_status,
                'created_at' => optional($r->created_at)->toIso8601String(),
                'status' => $r->status?->value,
            ]),
        ]);
    }

    public function approve(Request $request, CompanyReview $review): RedirectResponse
    {
        $note = $request->input('note');
        $this->moderation->approve($review, $request->user(), $note);

        return back()->with('success', 'Review disetujui.');
    }

    public function reject(Request $request, CompanyReview $review): RedirectResponse
    {
        $note = $request->input('note');
        $this->moderation->reject($review, $request->user(), $note);

        return back()->with('success', 'Review ditolak.');
    }
}
