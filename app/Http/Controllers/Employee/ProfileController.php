<?php

namespace App\Http\Controllers\Employee;

use App\Enums\ExperienceLevel;
use App\Enums\Gender;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\ProfileUpdateRequest;
use App\Models\City;
use App\Models\EmployeeProfile;
use App\Models\Province;
use App\Services\Files\FileUploadService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function __construct(private readonly FileUploadService $files) {}

    public function show(Request $request): Response
    {
        $user = $request->user();
        $profile = $this->resolveProfile($request)->load([
            'province:id,name',
            'city:id,name',
            'skills:id,name',
            'educations',
            'workExperiences',
            'certifications',
        ]);

        return Inertia::render('employee/profile/show', [
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar_url' => $user->avatar_path ? asset('storage/'.$user->avatar_path) : null,
                'headline' => $profile->headline,
                'about' => $profile->about,
                'date_of_birth' => optional($profile->date_of_birth)->format('Y-m-d'),
                'gender' => $profile->gender?->label(),
                'province' => $profile->province?->name,
                'city' => $profile->city?->name,
                'current_position' => $profile->current_position,
                'experience_level' => $profile->experience_level?->label(),
                'is_open_to_work' => $profile->is_open_to_work,
                'visibility' => $profile->visibility,
                'completion' => $profile->profile_completion,
                'portfolio_url' => $profile->portfolio_url,
                'linkedin_url' => $profile->linkedin_url,
                'github_url' => $profile->github_url,
                'skills' => $profile->skills->map(fn ($s): array => ['id' => $s->id, 'name' => $s->name])->values(),
                'educations' => $profile->educations->map(fn ($e): array => $e->only(['id', 'institution', 'level', 'major', 'start_year', 'end_year', 'gpa']))->values(),
                'work_experiences' => $profile->workExperiences->map(fn ($w): array => $w->only(['id', 'company_name', 'position', 'start_date', 'end_date', 'is_current', 'description']))->values(),
                'certifications' => $profile->certifications->map(fn ($c): array => $c->only(['id', 'name', 'issuer', 'issued_date']))->values(),
            ],
        ]);
    }

    public function edit(Request $request): Response
    {
        $profile = $this->resolveProfile($request);
        $user = $request->user();

        return Inertia::render('employee/profile/edit', [
            'avatarUrl' => $user->avatar_path ? asset('storage/'.$user->avatar_path) : null,
            'profile' => [
                ...$profile->toArray(),
                'gender' => $profile->gender?->value,
                'experience_level' => $profile->experience_level?->value,
                'date_of_birth' => optional($profile->date_of_birth)->format('Y-m-d'),
            ],
            'provinces' => Province::query()
                ->orderBy('name')
                ->get(['id', 'name']),
            'cities' => City::query()
                ->orderBy('name')
                ->get(['id', 'province_id', 'name']),
            'genderOptions' => collect(Gender::cases())
                ->map(fn (Gender $gender): array => ['value' => $gender->value, 'label' => $gender->label()])
                ->values(),
            'experienceLevelOptions' => collect(ExperienceLevel::cases())
                ->map(fn (ExperienceLevel $level): array => ['value' => $level->value, 'label' => $level->label()])
                ->values(),
            'visibilityOptions' => [
                ['value' => 'public', 'label' => 'Publik'],
                ['value' => 'recruiter_only', 'label' => 'Recruiter Only'],
                ['value' => 'private', 'label' => 'Private'],
            ],
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $profile = $this->resolveProfile($request);
        $validated = $request->validated();
        unset($validated['avatar']);

        if ($request->hasFile('avatar')) {
            $user = $request->user();
            $newPath = $this->files->storeImage($request->file('avatar'), 'avatars', 640);
            $this->files->delete($user->avatar_path);
            $user->forceFill(['avatar_path' => $newPath])->save();
        }

        $profile->fill($validated);
        $profile->profile_completion = $this->calculateProfileCompletion($profile);
        $profile->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Profil berhasil diperbarui.']);

        return to_route('employee.profile.edit');
    }

    private function resolveProfile(Request $request): EmployeeProfile
    {
        return $request->user()
            ->employeeProfile()
            ->firstOrCreate([], [
                'visibility' => 'public',
                'is_open_to_work' => true,
                'profile_completion' => 0,
            ]);
    }

    private function calculateProfileCompletion(EmployeeProfile $profile): int
    {
        $fields = [
            $profile->headline,
            $profile->about,
            $profile->date_of_birth,
            $profile->gender,
            $profile->province_id,
            $profile->city_id,
            $profile->current_position,
            $profile->experience_level,
            $profile->portfolio_url,
            $profile->linkedin_url,
            $profile->github_url,
        ];

        $filled = collect($fields)->filter(fn (mixed $value): bool => ! blank($value))->count();

        return (int) round(($filled / count($fields)) * 100);
    }
}
