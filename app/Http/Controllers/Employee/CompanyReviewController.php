<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Services\Reviews\ReviewModerationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class CompanyReviewController extends Controller
{
    public function __construct(private readonly ReviewModerationService $moderation) {}

    public function index(Request $request): Response
    {
        $reviews = CompanyReview::query()
            ->with('company:id,name,slug,logo_path')
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('employee/company-reviews/index', [
            'reviews' => $reviews->through(fn (CompanyReview $r) => [
                'id' => $r->id,
                'company_name' => $r->company?->name,
                'company_slug' => $r->company?->slug,
                'title' => $r->title,
                'rating' => $r->rating,
                'status' => $r->status?->value,
                'created_at' => optional($r->created_at)->toIso8601String(),
            ]),
        ]);
    }

    public function create(Request $request, Company $company): Response
    {
        return Inertia::render('employee/company-reviews/form', [
            'company' => $company->only(['id', 'name', 'slug', 'logo_path']),
            'review' => null,
        ]);
    }

    public function store(Request $request, Company $company): RedirectResponse
    {
        $data = $this->validated($request);

        try {
            $this->moderation->submit($request->user(), $company, $data);
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage())->withInput();
        }

        return redirect()->route('employee.company-reviews.index')
            ->with('success', 'Review terkirim. Akan ditinjau sebelum dipublikasikan.');
    }

    public function edit(Request $request, CompanyReview $review): Response
    {
        abort_unless($review->user_id === $request->user()->id, 403);

        return Inertia::render('employee/company-reviews/form', [
            'company' => $review->company?->only(['id', 'name', 'slug', 'logo_path']),
            'review' => $review->only([
                'id', 'title', 'rating', 'rating_management', 'rating_culture', 'rating_compensation',
                'rating_growth', 'rating_balance', 'pros', 'cons', 'advice_to_management',
                'employment_status', 'employment_type', 'job_title', 'would_recommend', 'is_anonymous',
            ]),
        ]);
    }

    public function update(Request $request, CompanyReview $review): RedirectResponse
    {
        abort_unless($review->user_id === $request->user()->id, 403);

        $data = $this->validated($request);

        try {
            $this->moderation->submit($request->user(), $review->company, $data);
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage())->withInput();
        }

        return redirect()->route('employee.company-reviews.index')
            ->with('success', 'Review diperbarui.');
    }

    public function destroy(Request $request, CompanyReview $review): RedirectResponse
    {
        abort_unless($review->user_id === $request->user()->id, 403);
        $review->delete();

        return back()->with('success', 'Review dihapus.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'rating_management' => ['nullable', 'integer', 'between:1,5'],
            'rating_culture' => ['nullable', 'integer', 'between:1,5'],
            'rating_compensation' => ['nullable', 'integer', 'between:1,5'],
            'rating_growth' => ['nullable', 'integer', 'between:1,5'],
            'rating_balance' => ['nullable', 'integer', 'between:1,5'],
            'pros' => ['nullable', 'string', 'max:2000'],
            'cons' => ['nullable', 'string', 'max:2000'],
            'advice_to_management' => ['nullable', 'string', 'max:2000'],
            'employment_status' => ['required', 'in:current,former'],
            'employment_type' => ['nullable', 'string', 'max:24'],
            'job_title' => ['nullable', 'string', 'max:120'],
            'would_recommend' => ['boolean'],
            'is_anonymous' => ['boolean'],
        ]);
    }
}
