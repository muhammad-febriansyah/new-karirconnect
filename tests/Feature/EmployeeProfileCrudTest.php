<?php

use App\Models\CandidateCv;
use App\Models\Certification;
use App\Models\Education;
use App\Models\EmployeeProfile;
use App\Models\User;
use App\Models\WorkExperience;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed([
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);
});

test('employee can open profile pages', function () {
    $employee = User::factory()->employee()->create([
        'email_verified_at' => now(),
    ]);

    $this->actingAs($employee)
        ->get(route('employee.profile.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('employee/profile/edit')
            ->has('provinces')
            ->has('cities')
        );

    $this->actingAs($employee)
        ->get(route('employee.educations.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('employee/profile/educations'));
});

test('non employee users cannot access employee profile area', function () {
    $admin = User::factory()->admin()->create([
        'email_verified_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get(route('employee.profile.edit'))
        ->assertForbidden();
});

test('employee can update profile and manage records', function () {
    $employee = User::factory()->employee()->create([
        'email_verified_at' => now(),
    ]);

    $this->actingAs($employee)
        ->patch(route('employee.profile.update'), [
            'headline' => 'Backend Engineer',
            'about' => 'Fokus pada Laravel dan React.',
            'date_of_birth' => '1998-08-12',
            'gender' => 'male',
            'province_id' => 1,
            'city_id' => 1,
            'current_position' => 'Software Engineer',
            'expected_salary_min' => 8000000,
            'expected_salary_max' => 12000000,
            'experience_level' => 'mid',
            'portfolio_url' => 'https://portfolio.test',
            'linkedin_url' => 'https://linkedin.test/in/demo',
            'github_url' => 'https://github.test/demo',
            'is_open_to_work' => true,
            'visibility' => 'public',
        ])
        ->assertRedirect(route('employee.profile.edit'));

    $profile = $employee->fresh()->employeeProfile;

    expect($profile)->not->toBeNull()
        ->and($profile->headline)->toBe('Backend Engineer')
        ->and($profile->profile_completion)->toBeGreaterThan(0);

    $this->actingAs($employee)
        ->post(route('employee.educations.store'), [
            'level' => 'S1',
            'institution' => 'Universitas Indonesia',
            'major' => 'Teknik Informatika',
            'gpa' => 3.75,
            'start_year' => 2018,
            'end_year' => 2022,
            'description' => 'Aktif di organisasi kampus.',
        ])
        ->assertRedirect(route('employee.educations.index'));

    $education = Education::query()->firstOrFail();

    $this->actingAs($employee)
        ->post(route('employee.work-experiences.store'), [
            'company_name' => 'PT KarirConnect',
            'position' => 'Backend Engineer',
            'employment_type' => 'full_time',
            'start_date' => '2022-07-01',
            'end_date' => '2024-07-01',
            'is_current' => false,
            'description' => 'Membangun modul employer dashboard.',
        ])
        ->assertRedirect(route('employee.work-experiences.index'));

    $workExperience = WorkExperience::query()->firstOrFail();

    $this->actingAs($employee)
        ->post(route('employee.certifications.store'), [
            'name' => 'AWS Certified Developer',
            'issuer' => 'Amazon Web Services',
            'credential_id' => 'AWS-12345',
            'credential_url' => 'https://credential.test/aws',
            'issued_date' => '2024-01-01',
            'expires_date' => '2027-01-01',
        ])
        ->assertRedirect(route('employee.certifications.index'));

    $certification = Certification::query()->firstOrFail();

    expect($education->institution)->toBe('Universitas Indonesia')
        ->and($workExperience->position)->toBe('Backend Engineer')
        ->and($certification->issuer)->toBe('Amazon Web Services');
});

test('employee can upload activate and delete cv', function () {
    Storage::fake('public');

    $employee = User::factory()->employee()->create([
        'email_verified_at' => now(),
    ]);

    EmployeeProfile::factory()->for($employee)->create();

    $this->actingAs($employee)
        ->post(route('employee.cvs.store'), [
            'label' => 'CV Backend 2026',
            'file' => UploadedFile::fake()->create('resume.pdf', 200, 'application/pdf'),
        ])
        ->assertRedirect(route('employee.cvs.index'));

    $cv = CandidateCv::query()->firstOrFail();

    Storage::disk('public')->assertExists($cv->file_path);

    $this->actingAs($employee)
        ->patch(route('employee.cvs.update', $cv), [
            'label' => 'CV Backend Senior 2026',
            'is_active' => true,
        ])
        ->assertRedirect(route('employee.cvs.index'));

    $cv->refresh();

    expect($cv->label)->toBe('CV Backend Senior 2026')
        ->and($cv->is_active)->toBeTrue();

    $this->actingAs($employee)
        ->delete(route('employee.cvs.destroy', $cv))
        ->assertRedirect(route('employee.cvs.index'));

    Storage::disk('public')->assertMissing($cv->file_path);
    $this->assertDatabaseMissing('candidate_cvs', ['id' => $cv->id]);
});
