<?php

use App\Models\City;
use App\Models\EmployeeProfile;
use App\Models\Province;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
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
        'locale' => 'id',
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

/**
 * @return array<string, mixed>
 */
function validOnboardingPayload(int $provinceId, int $cityId): array
{
    return [
        'phone' => '08123456789',
        'headline' => 'Backend Engineer',
        'about' => 'Full-stack engineer with focus on Laravel and React.',
        'date_of_birth' => '1995-05-10',
        'gender' => 'male',
        'province_id' => $provinceId,
        'city_id' => $cityId,
        'current_position' => 'Backend Engineer',
        'experience_level' => 'mid',
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
    ];
}

it('completes onboarding via profile form and redirects to dashboard', function (): void {
    $user = User::factory()->employee()->pendingOnboarding()->create();
    EmployeeProfile::factory()->create(['user_id' => $user->id]);
    $province = Province::factory()->create(['code' => 'X1', 'name' => 'Test Province']);
    $city = City::factory()->create(['province_id' => $province->id, 'name' => 'Test City']);

    $response = $this->actingAs($user)->post('/employee/onboarding', validOnboardingPayload($province->id, $city->id));

    $response->assertRedirect('/dashboard');

    $user->refresh();
    expect($user->onboarding_completed_at)->not->toBeNull();
    expect($user->phone)->toBe('08123456789');

    $profile = $user->employeeProfile()->with(['skills', 'workExperiences', 'educations'])->first();
    expect($profile->headline)->toBe('Backend Engineer');
    expect($profile->city_id)->toBe($city->id);
    expect($profile->skills)->toHaveCount(3);
    expect($profile->workExperiences)->toHaveCount(1);
    expect($profile->educations)->toHaveCount(1);
});

it('blocks onboarding completion when required profile fields are missing', function (): void {
    $user = User::factory()->employee()->pendingOnboarding()->create();
    EmployeeProfile::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)
        ->from('/employee/onboarding')
        ->post('/employee/onboarding', [
            'headline' => 'Backend Engineer',
            // missing about, date_of_birth, gender, province_id, city_id, current_position, experience_level, skills
        ]);

    $response->assertRedirect('/employee/onboarding');
    $response->assertSessionHasErrors(['about', 'date_of_birth', 'gender', 'province_id', 'city_id', 'experience_level', 'skills']);

    expect($user->refresh()->onboarding_completed_at)->toBeNull();
});

it('stores an uploaded profile photo during onboarding', function (): void {
    Storage::fake('public');

    $user = User::factory()->employee()->pendingOnboarding()->create();
    EmployeeProfile::factory()->create(['user_id' => $user->id]);
    $province = Province::factory()->create(['code' => 'X2', 'name' => 'Photo Province']);
    $city = City::factory()->create(['province_id' => $province->id, 'name' => 'Photo City']);

    $payload = validOnboardingPayload($province->id, $city->id);
    $payload['avatar'] = UploadedFile::fake()->image('me.jpg', 400, 400);

    $this->actingAs($user)
        ->post('/employee/onboarding', $payload)
        ->assertRedirect('/dashboard');

    $user->refresh();
    expect($user->avatar_path)->not->toBeNull();
    Storage::disk('public')->assertExists($user->avatar_path);
});

it('does not redirect to employee onboarding for non-employee roles', function (): void {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get('/dashboard')->assertOk();
});
