<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Employee\CompleteOnboardingAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\OnboardingStoreRequest;
use App\Http\Resources\Api\V1\EmployeeProfileResource;
use App\Http\Resources\Api\V1\UserResource;
use App\Models\City;
use App\Models\Province;
use App\Services\Ai\CvParserService;
use App\Services\Employee\EmployeeProfileService;
use App\Services\Employee\SkillResolver;
use App\Services\Files\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Jobseeker onboarding.
 *
 * The API does not enforce the onboarding middleware, so a mobile user is never
 * trapped by an unfinished wizard -- but onboarding_completed_at still gates
 * the web, and profile completion gates applying, so the app needs to be able
 * to finish it.
 */
class OnboardingController extends Controller
{
    public function __construct(
        private readonly EmployeeProfileService $profiles,
        private readonly CompleteOnboardingAction $completeOnboarding,
        private readonly CvParserService $parser,
        private readonly FileUploadService $files,
        private readonly SkillResolver $skills,
    ) {}

    /**
     * Whatever onboarding has captured so far, so the wizard can resume.
     */
    public function show(Request $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user())
            ->load(['skills:id,name', 'province:id,name', 'city:id,name']);

        return response()->json([
            'data' => new EmployeeProfileResource($profile),
            'meta' => [
                'user' => new UserResource($request->user()),
                'completed' => $request->user()->onboarding_completed_at !== null,
                'missing_items' => $this->profiles->missingItems($profile),
            ],
        ]);
    }

    /**
     * Finish onboarding. Shares CompleteOnboardingAction with the web wizard.
     */
    public function store(OnboardingStoreRequest $request): JsonResponse
    {
        $profile = $this->completeOnboarding->execute(
            $request->user(),
            $request->validated(),
            $request->file('avatar'),
        );

        return response()->json([
            'data' => new EmployeeProfileResource($profile->load(['skills:id,name', 'province:id,name', 'city:id,name'])),
            'meta' => ['user' => new UserResource($request->user()->fresh()), 'completed' => true],
        ]);
    }

    /**
     * Extract profile fields from an uploaded CV so the wizard can prefill.
     *
     * Costs an AI call, hence the tight rate limit on the route.
     */
    public function parseCv(Request $request): JsonResponse
    {
        $request->validate([
            'cv_file' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:10240'],
            'label' => ['nullable', 'string', 'max:120'],
        ]);

        $user = $request->user();
        $profile = $this->profiles->ensureProfile($user);
        $file = $request->file('cv_file');

        $parsed = $this->parser->parse($file->getPathname(), (string) $file->getMimeType(), $user->id);

        if ($parsed === null) {
            return response()->json([
                'message' => 'Tidak dapat mengekstrak data dari CV. Silakan isi form manual.',
                'code' => 'cv_parse_failed',
            ], 422);
        }

        $cv = $profile->cvs()->create([
            'label' => $request->string('label')->whenEmpty(fn () => 'CV Onboarding')->toString(),
            'source' => 'upload',
            'file_path' => $this->files->store($file, 'candidate-cvs'),
            'analyzed_json' => $parsed,
            'is_active' => false,
        ]);

        [$provinceId, $cityId] = $this->resolveLocation($parsed);

        return response()->json([
            'data' => [
                'cv' => [
                    'id' => $cv->id,
                    'label' => $cv->label,
                    'file_url' => asset('storage/'.$cv->file_path),
                ],
                'parsed' => [
                    'headline' => $parsed['headline'] ?? '',
                    'about' => $parsed['about'] ?? '',
                    'phone' => $parsed['phone'] ?? '',
                    'province_id' => $provinceId,
                    'city_id' => $cityId,
                    'current_position' => $parsed['experiences'][0]['job_title'] ?? '',
                    'skill_ids' => $this->skills->resolve($parsed['skills'] ?? []),
                    'work_experiences' => array_map(fn (array $row): array => [
                        'company_name' => $row['company_name'],
                        'position' => $row['job_title'],
                        'start_date' => $row['start_date'],
                        'end_date' => $row['end_date'],
                        'is_current' => $row['is_current'],
                        'description' => $row['description'],
                    ], $parsed['experiences'] ?? []),
                    'educations' => array_map(fn (array $row): array => [
                        'institution' => $row['institution'],
                        'major' => $row['field_of_study'] ?: $row['degree'],
                        'level' => $row['degree'],
                        'start_year' => $row['start_year'],
                        'end_year' => $row['end_year'],
                    ], $parsed['educations'] ?? []),
                ],
            ],
        ]);
    }

    /**
     * Map the parser's free-text location onto real province/city ids.
     *
     * @param  array<string, mixed>  $parsed
     * @return array{0: int|null, 1: int|null}
     */
    private function resolveLocation(array $parsed): array
    {
        $cityId = null;
        $provinceId = null;

        if (filled($parsed['location_city'] ?? null)) {
            $city = City::query()
                ->whereRaw('LOWER(name) = ?', [Str::lower($parsed['location_city'])])
                ->first();

            $cityId = $city?->id;
            $provinceId = $city?->province_id;
        }

        if ($provinceId === null && filled($parsed['location_province'] ?? null)) {
            $provinceId = Province::query()
                ->whereRaw('LOWER(name) = ?', [Str::lower($parsed['location_province'])])
                ->value('id');
        }

        return [$provinceId, $cityId];
    }
}
