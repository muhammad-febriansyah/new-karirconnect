<?php

namespace App\Actions\Employee;

use App\Models\EmployeeProfile;
use App\Models\User;
use App\Services\Employee\EmployeeProfileService;
use App\Services\Employee\SkillResolver;
use App\Services\Files\FileUploadService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Completes a jobseeker's onboarding: profile fields, skills, work history,
 * education, and the onboarding_completed_at stamp that lets them past
 * EnsureOnboardingCompleted.
 *
 * Extracted from Employee\OnboardingController so the web wizard and the mobile
 * API run the same code. The skill resolution in particular is easy to get
 * subtly wrong -- it accepts names or ids, matches case-insensitively, and
 * creates unknown skills -- and two copies would drift.
 */
class CompleteOnboardingAction
{
    public function __construct(
        private readonly EmployeeProfileService $profiles,
        private readonly FileUploadService $files,
        private readonly SkillResolver $skills,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $user, array $data, ?UploadedFile $avatar = null): EmployeeProfile
    {
        $profile = $this->profiles->ensureProfile($user);

        DB::transaction(function () use ($user, $profile, $data, $avatar): void {
            if ($avatar !== null) {
                $newPath = $this->files->storeImage($avatar, 'avatars', 640);
                $this->files->delete($user->avatar_path);
                $user->avatar_path = $newPath;
            }

            if (! empty($data['phone'])) {
                $user->phone = $data['phone'];
            }

            $profile->fill([
                'headline' => $data['headline'] ?? null,
                'about' => $data['about'] ?? null,
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'gender' => $data['gender'] ?? null,
                'province_id' => $data['province_id'] ?? null,
                'city_id' => $data['city_id'] ?? null,
                'current_position' => $data['current_position'] ?? null,
                'experience_level' => $data['experience_level'] ?? null,
                'linkedin_url' => $data['linkedin_url'] ?? null,
                'portfolio_url' => $data['portfolio_url'] ?? null,
                'github_url' => $data['github_url'] ?? null,
            ])->save();

            $skillIds = $this->skills->resolve($data['skills'] ?? []);

            if ($skillIds !== []) {
                $profile->skills()->syncWithoutDetaching(
                    collect($skillIds)->mapWithKeys(fn (int $id): array => [
                        $id => ['level' => 'intermediate'],
                    ])->all()
                );
            }

            foreach ($data['work_experiences'] ?? [] as $experience) {
                if (blank($experience['company_name'] ?? null)) {
                    continue;
                }

                $profile->workExperiences()->create([
                    'company_name' => $experience['company_name'],
                    'position' => $experience['position'] ?? 'Tidak diketahui',
                    'employment_type' => $experience['employment_type'] ?? null,
                    'start_date' => $experience['start_date'] ?? now()->toDateString(),
                    'end_date' => ($experience['is_current'] ?? false) ? null : ($experience['end_date'] ?? null),
                    'is_current' => (bool) ($experience['is_current'] ?? false),
                    'description' => $experience['description'] ?? null,
                ]);
            }

            foreach ($data['educations'] ?? [] as $education) {
                if (blank($education['institution'] ?? null)) {
                    continue;
                }

                $profile->educations()->create([
                    'institution' => $education['institution'],
                    'level' => $education['level'] ?? null,
                    'major' => $education['major'] ?? null,
                    'gpa' => $education['gpa'] ?? null,
                    'start_year' => $education['start_year'] ?? null,
                    'end_year' => $education['end_year'] ?? null,
                ]);
            }

            $user->onboarding_completed_at = now();
            $user->save();
        });

        $this->profiles->recomputeCompletion($profile->fresh());

        return $profile->fresh();
    }
}
