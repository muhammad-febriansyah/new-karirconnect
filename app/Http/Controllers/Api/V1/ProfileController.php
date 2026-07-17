<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SyncSkillsRequest;
use App\Http\Requests\Employee\ProfileUpdateRequest;
use App\Http\Resources\Api\V1\EmployeeProfileResource;
use App\Http\Resources\Api\V1\UserResource;
use App\Services\Employee\EmployeeProfileService;
use App\Services\Files\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /**
     * Relations the client needs to render the whole profile screen at once.
     */
    private const PROFILE_RELATIONS = [
        'province:id,name',
        'city:id,name',
        'skills:id,name',
        'educations',
        'workExperiences',
        'certifications',
    ];

    public function __construct(
        private readonly EmployeeProfileService $profiles,
        private readonly FileUploadService $files,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user())->load(self::PROFILE_RELATIONS);

        return response()->json([
            'data' => new EmployeeProfileResource($profile),
            'meta' => [
                'user' => new UserResource($request->user()),

                // What the profile still needs, so the app can nudge rather
                // than only show a bare percentage.
                'missing_items' => $this->profiles->missingItems($profile),
            ],
        ]);
    }

    /**
     * Reuses the web ProfileUpdateRequest, so both surfaces validate the same
     * fields with the same rules.
     */
    public function update(ProfileUpdateRequest $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $validated = $request->validated();
        unset($validated['avatar']);

        if ($request->hasFile('avatar')) {
            $user = $request->user();
            $newPath = $this->files->storeImage($request->file('avatar'), 'avatars', 640);
            $this->files->delete($user->avatar_path);
            $user->forceFill(['avatar_path' => $newPath])->save();
        }

        $profile->fill($validated)->save();

        $this->profiles->recomputeCompletion($profile);

        return response()->json([
            'data' => new EmployeeProfileResource($profile->fresh(self::PROFILE_RELATIONS)),
            'meta' => ['user' => new UserResource($request->user()->fresh())],
        ]);
    }

    /**
     * Replace the candidate's skill set.
     *
     * The web has no equivalent: ProfileUpdateRequest has no skills key and
     * ProfileController never touches the relation, so the only skills write in
     * the app is the onboarding wizard's syncWithoutDetaching. That leaves a
     * user unable to ever remove a skill. A mobile profile screen needs real
     * edits, so this syncs (not syncWithoutDetaching) and recomputes
     * completion, which weights skills.
     */
    public function syncSkills(SyncSkillsRequest $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $payload = collect($request->validated('skills'))
            ->mapWithKeys(fn (array $skill) => [
                $skill['id'] => [
                    'level' => $skill['level'] ?? null,
                    'years_experience' => $skill['years_experience'] ?? null,
                ],
            ])
            ->all();

        $profile->skills()->sync($payload);

        $this->profiles->recomputeCompletion($profile->fresh());

        return response()->json([
            'data' => new EmployeeProfileResource($profile->fresh(self::PROFILE_RELATIONS)),
        ]);
    }
}
