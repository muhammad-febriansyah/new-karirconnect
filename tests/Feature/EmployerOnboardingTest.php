<?php

use App\Enums\CompanyStatus;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

it('auto-creates a pending company on employer registration', function (): void {
    Notification::fake();

    $this->post('/register', [
        'name' => 'PIC Hiring',
        'email' => 'pic@company.test',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'employer',
        'company_name' => 'PT Maju Bersama',
    ]);

    $user = User::query()->where('email', 'pic@company.test')->firstOrFail();
    $company = Company::query()->where('owner_id', $user->id)->firstOrFail();

    expect($company->name)->toBe('PT Maju Bersama')
        ->and($company->status)->toBe(CompanyStatus::Pending)
        ->and($company->onboarding_completed_at)->toBeNull();

    $this->assertDatabaseHas('company_members', [
        'company_id' => $company->id,
        'user_id' => $user->id,
        'role' => 'owner',
    ]);
});

it('forces employer with pending onboarding to the wizard', function (): void {
    $employer = User::factory()->employer()->create();
    Company::factory()->for($employer, 'owner')->pendingOnboarding()->create();

    $this->actingAs($employer)->get('/dashboard')->assertRedirect('/employer/onboarding');
    $this->actingAs($employer)->get('/employer/jobs')->assertRedirect('/employer/onboarding');
});

it('renders the employer onboarding page', function (): void {
    $employer = User::factory()->employer()->create();
    Company::factory()->for($employer, 'owner')->pendingOnboarding()->create();

    $this->actingAs($employer)->get('/employer/onboarding')->assertOk();
});

it('saves company profile via onboarding', function (): void {
    $employer = User::factory()->employer()->create();
    $company = Company::factory()->for($employer, 'owner')->pendingOnboarding()->create([
        'name' => 'PT Lama',
    ]);

    $response = $this->actingAs($employer)->post('/employer/onboarding/profile', [
        'name' => 'PT Karir Maju',
        'tagline' => 'Lebih dekat dengan kandidat tepat',
        'website' => 'https://karir-maju.test',
        'about' => 'Perusahaan teknologi.',
    ]);

    $response->assertRedirect();
    $company->refresh();
    expect($company->name)->toBe('PT Karir Maju');
    expect($company->website)->toBe('https://karir-maju.test');
});

it('finalizes onboarding and redirects to dashboard', function (): void {
    $employer = User::factory()->employer()->create();
    Company::factory()->for($employer, 'owner')->pendingOnboarding()->create();

    $this->actingAs($employer)->post('/employer/onboarding/finish')->assertRedirect('/dashboard');

    $company = Company::query()->where('owner_id', $employer->id)->firstOrFail();
    expect($company->onboarding_completed_at)->not->toBeNull();
});

it('blocks job posting until company is approved', function (): void {
    $employer = User::factory()->employer()->create();
    Company::factory()->for($employer, 'owner')->create([
        'status' => CompanyStatus::Pending,
    ]);

    $this->actingAs($employer)
        ->get('/employer/jobs')
        ->assertRedirect('/employer/company/verification');
});

it('allows job posting once company is approved', function (): void {
    $employer = User::factory()->employer()->create();
    Company::factory()->for($employer, 'owner')->approved()->create();

    $this->actingAs($employer)->get('/employer/jobs')->assertOk();
});
