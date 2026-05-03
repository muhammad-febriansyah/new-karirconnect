<?php

use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\User;

/**
 * Golden-path smoke test — visit setiap halaman utama per role, pastikan
 * tidak ada 500 / unhandled exception. Bukan ganti unit test domain logic;
 * ini early-warning kalau routing / Inertia render / shared props rusak.
 */
it('renders public landing pages without error', function (string $path): void {
    $this->get($path)->assertOk();
})->with([
    '/',
    '/jobs',
    '/companies',
    '/salary-insight',
    '/career-resources',
    '/faq',
    '/contact',
    '/tentang-kami',
]);

it('renders admin dashboard pages without error', function (string $path): void {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get($path)->assertOk();
})->with([
    '/dashboard',
    '/admin/companies',
    '/admin/company-verifications',
    '/admin/jobs',
    '/admin/job-categories',
    '/admin/skills',
    '/admin/industries',
    '/admin/company-sizes',
    '/admin/announcements',
    '/admin/career-resources',
    '/admin/salary-insights',
    '/admin/faqs',
    '/admin/legal-pages',
    '/admin/assessment-questions',
    '/admin/reviews',
    '/admin/reports',
    '/admin/orders',
    '/admin/ai-audit-logs',
    '/admin/audit-logs',
    '/admin/talent-search-logs',
    '/admin/about-page',
    '/admin/settings',
    '/admin/settings/general',
    '/admin/settings/branding',
    '/admin/settings/seo',
    '/admin/settings/ai',
    '/admin/settings/payment',
    '/admin/settings/email',
    '/admin/settings/security',
    '/admin/settings/feature_flags',
    '/admin/settings/legal',
]);

it('renders employer dashboard pages without error', function (string $path): void {
    $employer = User::factory()->employer()->create();
    Company::factory()->create(['owner_id' => $employer->id]);

    $this->actingAs($employer)->get($path)->assertOk();
})->with([
    '/dashboard',
    '/employer/company/edit',
    '/employer/company/verification',
    '/employer/team',
    '/employer/jobs',
    '/employer/applicants',
    '/employer/interviews',
    '/employer/ai-interviews',
    '/employer/ai-interview-templates',
    '/employer/company-reviews',
    '/employer/billing',
    '/employer/message-templates',
]);

it('renders employee dashboard pages without error', function (string $path): void {
    $employee = User::factory()->employee()->create();
    EmployeeProfile::factory()->create(['user_id' => $employee->id]);

    $this->actingAs($employee)->get($path)->assertOk();
})->with([
    '/dashboard',
    '/employee/profile/edit',
    '/employee/profile/educations',
    '/employee/profile/work-experiences',
    '/employee/profile/certifications',
    '/employee/cv/index',
    '/employee/cv/builder',
    '/employee/applications',
    '/employee/saved-jobs',
    '/employee/job-alerts',
    '/employee/recommendations',
    '/employee/interviews',
    '/employee/ai-interviews',
    '/employee/skill-assessments',
    '/employee/career-coach',
    '/employee/messages',
    '/employee/company-reviews',
    '/employee/salary-submissions',
    '/notifications',
]);

it('renders auth + settings pages without error', function (string $path): void {
    $this->get($path)->assertOk();
})->with([
    '/login',
    '/register',
    '/forgot-password',
]);

it('renders user settings pages when authenticated', function (string $path): void {
    $user = User::factory()->create();

    $this->actingAs($user)->get($path)->assertOk();
})->with([
    '/settings/profile',
]);

it('redirects /settings/security through password confirm', function (): void {
    // /settings/security sengaja minta password confirm. Cukup pastikan
    // bukan 500/404 — boleh 200 (sudah confirmed) atau 302 (redirect ke confirm).
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/settings/security');

    expect($response->status())->toBeIn([200, 302]);
});
