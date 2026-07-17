<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\CvBuilderRequest;
use App\Services\Employee\CvBuilderService;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The generated-CV builder: the candidate fills in structured data and the
 * service renders a PDF and stores it as a CandidateCv.
 *
 * Distinct from CvController, which handles uploaded files.
 */
class CvBuilderController extends Controller
{
    public function __construct(
        private readonly EmployeeProfileService $profiles,
        private readonly CvBuilderService $builder,
    ) {}

    /**
     * The saved builder draft, so the form can be resumed.
     */
    public function show(Request $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        return response()->json([
            'data' => [
                // cv_builder_json is the draft; null means nothing built yet.
                'draft' => $profile->cv_builder_json,
                'primary_resume_id' => $profile->primary_resume_id,
            ],
        ]);
    }

    /**
     * Build the CV. Renders a PDF and stores it as a CandidateCv.
     */
    public function update(CvBuilderRequest $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $payload = $request->validated();
        $label = $payload['label'] ?? 'CV Builder';
        unset($payload['label']);

        $cv = $this->builder->build($profile, $payload, $label);

        // A generated CV counts toward completion, same as an uploaded one.
        $this->profiles->recomputeCompletion($profile->fresh());

        return response()->json([
            'message' => 'CV berhasil disimpan dan PDF di-generate.',
            'data' => [
                'id' => $cv->id,
                'label' => $cv->label,
                'file_url' => $cv->file_path ? asset('storage/'.$cv->file_path) : null,
                'is_active' => (bool) $cv->is_active,
            ],
        ]);
    }
}
