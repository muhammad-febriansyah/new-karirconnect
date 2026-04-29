<?php

namespace App\Http\Controllers\Employee;

use App\Enums\ExperienceLevel;
use App\Enums\Gender;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\ProfileUpdateRequest;
use App\Models\City;
use App\Models\EmployeeProfile;
use App\Models\Province;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        $profile = $this->resolveProfile($request);

        return Inertia::render('employee/profile/edit', [
            'profile' => [
                ...$profile->toArray(),
                'gender' => $profile->gender?->value,
                'experience_level' => $profile->experience_level?->value,
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
        $profile->fill($request->validated());
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
            $profile->expected_salary_min,
            $profile->expected_salary_max,
            $profile->experience_level,
            $profile->portfolio_url,
            $profile->linkedin_url,
            $profile->github_url,
        ];

        $filled = collect($fields)->filter(fn (mixed $value): bool => ! blank($value))->count();

        return (int) round(($filled / count($fields)) * 100);
    }
}
