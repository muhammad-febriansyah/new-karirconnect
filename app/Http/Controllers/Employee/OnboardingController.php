<?php

namespace App\Http\Controllers\Employee;

use App\Actions\Employee\CompleteOnboardingAction;
use App\Enums\ExperienceLevel;
use App\Enums\Gender;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\OnboardingStoreRequest;
use App\Models\City;
use App\Models\Province;
use App\Models\Skill;
use App\Services\Ai\CvParserService;
use App\Services\Employee\EmployeeProfileService;
use App\Services\Employee\SkillResolver;
use App\Services\Files\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function __construct(
        private readonly EmployeeProfileService $profiles,
        private readonly FileUploadService $files,
        private readonly CvParserService $parser,
        private readonly CompleteOnboardingAction $completeOnboarding,
        private readonly SkillResolver $skills,
    ) {}

    public function edit(Request $request): Response
    {
        $user = $request->user();
        $profile = $this->profiles->ensureProfile($user)
            ->load(['skills:id,name', 'province:id,name', 'city:id,name,province_id']);

        return Inertia::render('employee/onboarding', [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar_url' => $user->avatar_path ? asset('storage/'.$user->avatar_path) : null,
            ],
            'profile' => [
                'headline' => $profile->headline,
                'about' => $profile->about,
                'date_of_birth' => optional($profile->date_of_birth)->format('Y-m-d'),
                'gender' => $profile->gender?->value,
                'province_id' => $profile->province_id,
                'city_id' => $profile->city_id,
                'current_position' => $profile->current_position,
                'experience_level' => $profile->experience_level?->value,
                'linkedin_url' => $profile->linkedin_url,
                'portfolio_url' => $profile->portfolio_url,
                'github_url' => $profile->github_url,
                'skill_ids' => $profile->skills->pluck('id')->all(),
            ],
            'options' => [
                'genders' => collect(Gender::cases())->map(fn (Gender $g): array => [
                    'value' => $g->value,
                    'label' => $g->label(),
                ])->all(),
                'experience_levels' => collect(ExperienceLevel::cases())->map(fn (ExperienceLevel $l): array => [
                    'value' => $l->value,
                    'label' => $l->label(),
                ])->all(),
                'provinces' => Province::query()
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->map(fn (Province $p): array => ['value' => (string) $p->id, 'label' => $p->name])
                    ->all(),
                'cities' => City::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'province_id'])
                    ->map(fn (City $c): array => [
                        'value' => (string) $c->id,
                        'label' => $c->name,
                        'province_id' => $c->province_id,
                    ])
                    ->all(),
                'skills' => Skill::query()
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->limit(500)
                    ->get(['id', 'name'])
                    ->map(fn (Skill $s): array => ['value' => (string) $s->id, 'label' => $s->name])
                    ->all(),
            ],
        ]);
    }

    public function store(OnboardingStoreRequest $request): RedirectResponse
    {
        // Shared with the mobile API via CompleteOnboardingAction.
        $this->completeOnboarding->execute(
            $request->user(),
            $request->validated(),
            $request->file('avatar'),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Profil berhasil disimpan. Selamat datang di KarirConnect!',
        ]);

        return to_route('dashboard');
    }

    public function parseCv(Request $request): JsonResponse
    {
        $request->validate([
            'cv_file' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:10240'],
            'label' => ['nullable', 'string', 'max:120'],
        ]);

        $user = $request->user();
        $profile = $this->profiles->ensureProfile($user);
        $file = $request->file('cv_file');

        $parsed = $this->parser->parse(
            $file->getPathname(),
            (string) $file->getMimeType(),
            $user->id,
        );

        if ($parsed === null) {
            return response()->json([
                'error' => 'Tidak dapat mengekstrak data dari CV. Silakan isi form manual.',
            ], 422);
        }

        $path = $this->files->store($file, 'candidate-cvs');
        $cv = $profile->cvs()->create([
            'label' => $request->string('label')->whenEmpty(fn () => 'CV Onboarding')->toString(),
            'source' => 'upload',
            'file_path' => $path,
            'analyzed_json' => $parsed,
            'is_active' => false,
        ]);

        $matchedSkillIds = $this->skills->resolve($parsed['skills'] ?? []);

        $cityId = null;
        $provinceId = null;

        if (filled($parsed['location_city'])) {
            $city = City::query()
                ->whereRaw('LOWER(name) = ?', [Str::lower($parsed['location_city'])])
                ->first();
            $cityId = $city?->id;
            $provinceId = $city?->province_id;
        }

        if ($provinceId === null && filled($parsed['location_province'])) {
            $province = Province::query()
                ->whereRaw('LOWER(name) = ?', [Str::lower($parsed['location_province'])])
                ->first();
            $provinceId = $province?->id;
        }

        return response()->json([
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
                'skill_ids' => $matchedSkillIds,
                'work_experiences' => array_map(fn (array $e): array => [
                    'company_name' => $e['company_name'],
                    'position' => $e['job_title'],
                    'start_date' => $e['start_date'],
                    'end_date' => $e['end_date'],
                    'is_current' => $e['is_current'],
                    'description' => $e['description'],
                ], $parsed['experiences'] ?? []),
                'educations' => array_map(fn (array $e): array => [
                    'institution' => $e['institution'],
                    'major' => $e['field_of_study'] ?: $e['degree'],
                    'level' => $e['degree'],
                    'start_year' => $e['start_year'],
                    'end_year' => $e['end_year'],
                    'gpa' => $e['gpa'],
                ], $parsed['educations'] ?? []),
            ],
        ]);
    }

    /**
     * @param  array<int, mixed>  $names
     * @return array<int, int>
     */
}
