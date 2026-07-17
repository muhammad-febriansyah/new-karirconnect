<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SalarySubmissionRequest;
use App\Models\SalarySubmission;
use App\Services\SalaryInsight\SalaryInsightService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalaryController extends Controller
{
    public function __construct(private readonly SalaryInsightService $insight) {}

    /**
     * Aggregated salary data. Public.
     */
    public function insights(Request $request): JsonResponse
    {
        $filters = $this->extractFilters($request);

        return response()->json([
            'data' => [
                'aggregate' => $this->insight->aggregate($filters),
                'top_companies' => $this->insight->topCompanies($filters),
                'recent_submissions' => $this->insight->recentSubmissions($filters),
                'popular_categories' => $this->insight->categoriesWithSamples(),
                'curated_insights' => $this->insight->curatedInsights($filters),
            ],
            'meta' => ['filters' => $filters],
        ]);
    }

    /**
     * My own salary submissions, in any state.
     */
    public function mine(Request $request): JsonResponse
    {
        $rows = SalarySubmission::query()
            ->with(['category:id,name', 'company:id,name', 'city:id,name'])
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($rows->items())->map(fn (SalarySubmission $row) => [
                'id' => $row->id,
                'job_title' => $row->job_title,
                'salary_idr' => $row->salary_idr,
                'bonus_idr' => $row->bonus_idr,
                'experience_level' => $row->experience_level?->value,
                'experience_years' => $row->experience_years,
                'employment_type' => $row->employment_type,
                'category' => $row->category?->name,
                'company' => $row->company?->name,
                'city' => $row->city?->name,
                'is_anonymous' => (bool) $row->is_anonymous,
                'status' => $row->status,
                'created_at' => $row->created_at?->toIso8601String(),
            ]),
            'meta' => ['total' => $rows->total()],
        ]);
    }

    public function store(SalarySubmissionRequest $request): JsonResponse
    {
        $submission = SalarySubmission::query()->create([
            ...$request->validated(),
            'user_id' => $request->user()->id,

            // Submissions are moderated before they feed the public aggregate;
            // a client must not be able to choose its own status.
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Data gaji terkirim. Akan ditinjau sebelum masuk agregat publik.',
            'data' => ['id' => $submission->id, 'status' => $submission->status],
        ], 201);
    }

    public function destroy(Request $request, SalarySubmission $submission): JsonResponse
    {
        abort_unless($submission->user_id === $request->user()->id, 403);

        $submission->delete();

        return response()->json(['message' => 'Data gaji dihapus.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function extractFilters(Request $request): array
    {
        return array_filter([
            'job_category_id' => $request->integer('job_category_id') ?: null,
            'city_id' => $request->integer('city_id') ?: null,
            'province_id' => $request->integer('province_id') ?: null,
            'experience_level' => $request->input('experience_level'),
            'employment_type' => $request->input('employment_type'),
        ], static fn ($value) => $value !== null && $value !== '');
    }
}
