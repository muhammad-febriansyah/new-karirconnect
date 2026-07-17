<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\JobResource;
use App\Models\Job;
use App\Services\Employee\EmployeeProfileService;
use App\Services\Recommendations\JobRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function __construct(
        private readonly JobRecommendationService $recommendations,
        private readonly EmployeeProfileService $profiles,
    ) {}

    /**
     * Jobs matched to the candidate's profile, each with why it matched.
     */
    public function index(Request $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $rows = $this->recommendations->recommend($profile, min($request->integer('limit') ?: 12, 30));

        return response()->json([
            // JobResource carries the salary/anonymity masking. The recommender
            // returns full models, and hand-building rows here is exactly how
            // the web page ended up publishing hidden salaries and the employer
            // behind an anonymous posting.
            'data' => $rows->map(fn (array $row) => [
                'job' => new JobResource($row['job']),
                'score' => $row['score'],
                'breakdown' => $row['breakdown'],
                'explanation' => $row['explanation'],
            ])->values(),
            'meta' => ['profile_completion' => (int) $profile->profile_completion],
        ]);
    }

    /**
     * Hide a recommendation so it stops coming back.
     */
    public function dismiss(Request $request, Job $job): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $this->recommendations->dismiss($profile, $job);

        return response()->json(['message' => 'Rekomendasi disembunyikan.']);
    }
}
