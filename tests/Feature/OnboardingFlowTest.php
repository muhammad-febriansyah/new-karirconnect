<?php

use App\Models\EmployeeProfile;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Fortify\Features;

uses(RefreshDatabase::class);

it('redirects unverified users to verify-email after register', function (): void {
    Notification::fake();

    $response = $this->post('/register', [
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'employee',
    ]);

    $user = User::query()->where('email', 'budi@example.com')->first();
    expect($user)->not->toBeNull();
    expect($user->email_verified_at)->toBeNull();
    expect($user->onboarding_completed_at)->toBeNull();

    $response->assertRedirect();

    if (Features::enabled(Features::emailVerification())) {
        Notification::assertSentTo($user, VerifyEmail::class);
    }
});

it('forces verified employee with no onboarding to the onboarding page', function (): void {
    $user = User::factory()->employee()->pendingOnboarding()->create();

    $this->actingAs($user)->get('/dashboard')->assertRedirect('/employee/onboarding');
    $this->actingAs($user)->get('/employee/profile/edit')->assertRedirect('/employee/onboarding');
});

it('renders the onboarding page for a fresh employee', function (): void {
    $user = User::factory()->employee()->pendingOnboarding()->create();

    $this->actingAs($user)->get('/employee/onboarding')->assertOk();
});

it('completes onboarding via manual form and redirects to dashboard', function (): void {
    $user = User::factory()->employee()->pendingOnboarding()->create();
    EmployeeProfile::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->post('/employee/onboarding', [
        'phone' => '08123456789',
        'headline' => 'Backend Engineer',
        'about' => 'Full-stack engineer with focus on Laravel and React.',
        'current_position' => 'Backend Engineer',
        'experience_level' => 'mid',
        'expected_salary_min' => 8000000,
        'expected_salary_max' => 12000000,
        'skills' => ['PHP', 'Laravel', 'React'],
        'work_experiences' => [
            [
                'company_name' => 'Tokopedia',
                'position' => 'Backend Engineer',
                'start_date' => '2022-01-01',
                'end_date' => null,
                'is_current' => true,
                'description' => 'Worked on payment service.',
            ],
        ],
        'educations' => [
            [
                'institution' => 'Universitas Indonesia',
                'level' => 'S1',
                'major' => 'Ilmu Komputer',
                'start_year' => 2018,
                'end_year' => 2022,
                'gpa' => '3.5',
            ],
        ],
    ]);

    $response->assertRedirect('/dashboard');

    $user->refresh();
    expect($user->onboarding_completed_at)->not->toBeNull();
    expect($user->phone)->toBe('08123456789');

    $profile = $user->employeeProfile()->with(['skills', 'workExperiences', 'educations'])->first();
    expect($profile->headline)->toBe('Backend Engineer');
    expect($profile->skills)->toHaveCount(3);
    expect($profile->workExperiences)->toHaveCount(1);
    expect($profile->educations)->toHaveCount(1);
});

it('does not redirect to employee onboarding for non-employee roles', function (): void {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get('/dashboard')->assertOk();
});
