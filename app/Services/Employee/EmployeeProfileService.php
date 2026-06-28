<?php

namespace App\Services\Employee;

use App\Models\EmployeeProfile;
use App\Models\User;

class EmployeeProfileService
{
    /**
     * Lazily resolve (or create) an empty profile for the given user.
     */
    public function ensureProfile(User $user): EmployeeProfile
    {
        return $user->employeeProfile()->firstOrCreate([]);
    }

    /**
     * Build a checklist of profile fields that are still missing, used by
     * the employee dashboard "Lengkapi profil" widget. Each entry has a
     * label, a link to the relevant edit page, and a key for de-duplication.
     *
     * @return array<int, array{key: string, label: string, href: string}>
     */
    public function missingItems(EmployeeProfile $profile): array
    {
        $profile->loadMissing(['educations', 'workExperiences', 'skills', 'cvs']);

        $items = [];
        $profileEdit = '/employee/profile/edit';

        if (blank($profile->headline)) {
            $items[] = ['key' => 'headline', 'label' => 'Tulis headline / tagline profil', 'href' => $profileEdit];
        }
        if (blank($profile->about)) {
            $items[] = ['key' => 'about', 'label' => 'Tambahkan deskripsi tentang Anda', 'href' => $profileEdit];
        }
        if (blank($profile->date_of_birth)) {
            $items[] = ['key' => 'date_of_birth', 'label' => 'Lengkapi tanggal lahir', 'href' => $profileEdit];
        }
        if (blank($profile->gender)) {
            $items[] = ['key' => 'gender', 'label' => 'Pilih jenis kelamin', 'href' => $profileEdit];
        }
        if (blank($profile->city_id)) {
            $items[] = ['key' => 'location', 'label' => 'Tentukan lokasi (provinsi & kota)', 'href' => $profileEdit];
        }
        if (blank($profile->current_position)) {
            $items[] = ['key' => 'current_position', 'label' => 'Isi posisi pekerjaan saat ini', 'href' => $profileEdit];
        }
        if (blank($profile->experience_level)) {
            $items[] = ['key' => 'experience_level', 'label' => 'Tentukan level pengalaman', 'href' => $profileEdit];
        }
        if ($profile->workExperiences->isEmpty()) {
            $items[] = ['key' => 'work_experience', 'label' => 'Tambahkan pengalaman kerja', 'href' => '/employee/profile/work-experiences'];
        }
        if ($profile->educations->isEmpty()) {
            $items[] = ['key' => 'education', 'label' => 'Tambahkan riwayat pendidikan', 'href' => '/employee/profile/educations'];
        }
        if ($profile->skills->count() < 3) {
            $items[] = ['key' => 'skills', 'label' => 'Pilih minimal 3 skill', 'href' => $profileEdit];
        }
        if ($profile->cvs->isEmpty()) {
            $items[] = ['key' => 'cv', 'label' => 'Upload minimal satu CV', 'href' => '/employee/cv/index'];
        }
        if (blank($profile->linkedin_url) && blank($profile->portfolio_url) && blank($profile->github_url)) {
            $items[] = ['key' => 'links', 'label' => 'Tambah tautan online (LinkedIn, portfolio, GitHub)', 'href' => $profileEdit];
        }

        return $items;
    }

    /**
     * Recompute the profile_completion percentage based on filled fields and
     * presence of supporting records (education, experience, skills, CV).
     * Idempotent — safe to call after every profile mutation.
     */
    public function recomputeCompletion(EmployeeProfile $profile): int
    {
        $profile->loadMissing(['educations', 'workExperiences', 'skills', 'cvs']);

        $score = 0;

        // Identitas dasar (50)
        if (filled($profile->headline)) {
            $score += 10;
        }
        if (filled($profile->about)) {
            $score += 10;
        }
        if (filled($profile->date_of_birth)) {
            $score += 5;
        }
        if (filled($profile->city_id)) {
            $score += 5;
        }
        if (filled($profile->current_position)) {
            $score += 10;
        }
        if (filled($profile->experience_level)) {
            $score += 10;
        }

        // Records (40)
        if ($profile->educations->isNotEmpty()) {
            $score += 15;
        }
        if ($profile->workExperiences->isNotEmpty()) {
            $score += 15;
        }
        if ($profile->skills->count() >= 3) {
            $score += 10;
        } elseif ($profile->skills->isNotEmpty()) {
            $score += 5;
        }

        // CV (10)
        if ($profile->cvs->isNotEmpty()) {
            $score += 10;
        }

        $score = min($score, 100);

        if ($profile->profile_completion !== $score) {
            $profile->forceFill(['profile_completion' => $score])->save();
        }

        return $score;
    }
}
