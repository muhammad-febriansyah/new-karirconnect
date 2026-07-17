<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\CandidateCvRequest;
use App\Http\Requests\Employee\CandidateCvUpdateRequest;
use App\Models\CandidateCv;
use App\Services\Employee\CandidateCvService;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CvController extends Controller
{
    public function __construct(
        private readonly CandidateCvService $cvs,
        private readonly EmployeeProfileService $profiles,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $items = $profile->cvs()->latest('id')->get()->map(fn (CandidateCv $cv): array => [
            'id' => $cv->id,
            'label' => $cv->label,
            'source' => $cv->source,
            'is_active' => (bool) $cv->is_active,
            'pages_count' => $cv->pages_count,
            'file_url' => $cv->file_path ? asset('storage/'.$cv->file_path) : null,
            'created_at' => $cv->created_at?->toIso8601String(),
        ]);

        return response()->json([
            'data' => $items,
            'meta' => ['primary_resume_id' => $profile->primary_resume_id],
        ]);
    }

    public function store(CandidateCvRequest $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $cv = $this->cvs->store($profile, $request->file('file'), $request->validated('label'));

        // A CV is worth 10 points in the completion score, and the 60% gate on
        // applying reads that score.
        $this->profiles->recomputeCompletion($profile->fresh());

        return response()->json([
            'data' => [
                'id' => $cv->id,
                'label' => $cv->label,
                'is_active' => (bool) $cv->is_active,
                'file_url' => $cv->file_path ? asset('storage/'.$cv->file_path) : null,
            ],
        ], 201);
    }

    public function update(CandidateCvUpdateRequest $request, CandidateCv $candidateCv): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        abort_unless($candidateCv->employee_profile_id === $profile->id, 404);

        $cv = $this->cvs->update(
            $profile,
            $candidateCv,
            $request->validated('label'),
            $request->validated('is_active'),
        );

        return response()->json([
            'data' => [
                'id' => $cv->id,
                'label' => $cv->label,
                'is_active' => (bool) $cv->is_active,
            ],
            'meta' => ['primary_resume_id' => $profile->fresh()->primary_resume_id],
        ]);
    }

    public function destroy(Request $request, CandidateCv $candidateCv): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        abort_unless($candidateCv->employee_profile_id === $profile->id, 404);

        $this->cvs->delete($profile, $candidateCv);

        $this->profiles->recomputeCompletion($profile->fresh());

        return response()->json(['message' => 'CV dihapus.']);
    }
}
