<?php

use App\Models\City;
use App\Models\Province;
use App\Models\User;
use App\Services\Employee\EmployeeProfileService;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    $this->seed(SettingSeeder::class);
});

test('non employees cannot access employee profile pages', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get(route('employee.profile.edit'))
        ->assertForbidden();
});

test('employee can render profile edit page', function () {
    $employee = User::factory()->employee()->create();

    $this->actingAs($employee)
        ->get(route('employee.profile.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('employee/profile/edit'));
});

test('employee profile completion auto recomputes on save', function () {
    $employee = User::factory()->employee()->create();
    $service = app(EmployeeProfileService::class);

    $profile = $service->ensureProfile($employee);
    expect($profile->refresh()->profile_completion)->toBe(0);

    $profile->fill([
        'headline' => 'Backend Engineer',
        'about' => 'Hello world',
        'current_position' => 'BE',
        'experience_level' => 'mid',
        'expected_salary_min' => 5000000,
    ])->save();

    $score = $service->recomputeCompletion($profile->refresh());

    expect($score)->toBeGreaterThanOrEqual(40);
    expect($profile->refresh()->profile_completion)->toBe($score);
});

test('employee can add education and experiences', function () {
    $employee = User::factory()->employee()->create();
    $this->actingAs($employee);

    $this->post(route('employee.educations.store'), [
        'level' => 'sma',
        'institution' => 'SMA Negeri 1',
        'start_year' => 2015,
        'end_year' => 2018,
    ])->assertRedirect();

    $this->post(route('employee.work-experiences.store'), [
        'company_name' => 'PT Demo',
        'position' => 'Engineer',
        'start_date' => '2022-01-01',
        'is_current' => true,
        'description' => 'Tanggung jawab',
    ])->assertRedirect();

    $profile = $employee->employeeProfile()->first();
    expect($profile->educations()->count())->toBe(1);
    expect($profile->workExperiences()->count())->toBe(1);
});

test('employee can save cv builder draft and pdf is generated', function () {
    $employee = User::factory()->employee()->create();
    $this->actingAs($employee);

    $this->post(route('employee.cv.builder.update'), [
        'label' => 'CV Backend 2026',
        'personal' => [
            'full_name' => 'Budi Santoso',
            'email' => 'budi@example.com',
        ],
        'summary' => 'Senior backend engineer.',
        'experiences' => [
            ['company' => 'PT A', 'position' => 'Backend', 'period' => '2022-2024'],
        ],
        'educations' => [],
        'skills' => ['Laravel', 'PHP'],
        'certifications' => [],
    ])->assertRedirect();

    $profile = $employee->employeeProfile()->first();
    expect($profile->cv_builder_json)->not->toBeNull();
    expect($profile->cvs()->where('source', 'builder')->count())->toBe(1);

    $cv = $profile->cvs()->where('source', 'builder')->first();
    expect(Storage::disk('public')->exists($cv->file_path))->toBeTrue();
});

test('employee can update profile fields with city dropdown', function () {
    $employee = User::factory()->employee()->create();
    $province = Province::factory()->create(['code' => 'X1', 'name' => 'Test Province']);
    $city = City::factory()->create(['province_id' => $province->id, 'name' => 'Test City']);

    $this->actingAs($employee)
        ->patch(route('employee.profile.update'), [
            'headline' => 'Senior Engineer',
            'province_id' => $province->id,
            'city_id' => $city->id,
            'experience_level' => 'senior',
            'is_open_to_work' => true,
            'visibility' => 'public',
        ])
        ->assertRedirect();

    $profile = $employee->employeeProfile()->first();
    expect($profile->city_id)->toBe($city->id);
    expect($profile->headline)->toBe('Senior Engineer');
});
