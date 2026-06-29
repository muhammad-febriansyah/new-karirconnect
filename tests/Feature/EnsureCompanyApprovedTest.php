<?php

use App\Enums\CompanyStatus;
use App\Enums\CompanyVerificationStatus;
use App\Models\Company;
use App\Models\User;

function employerWithCompany(array $companyState = []): array
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->create(array_merge(['owner_id' => $owner->id], $companyState));

    return compact('owner', 'company');
}

test('approved company can reach gated employer routes', function () {
    ['owner' => $owner] = employerWithCompany(['status' => CompanyStatus::Approved]);

    $this->actingAs($owner)->get('/employer/jobs')->assertOk();
});

test('pending unverified company is redirected to verification', function () {
    ['owner' => $owner] = employerWithCompany([
        'status' => CompanyStatus::Pending,
        'verification_status' => CompanyVerificationStatus::Unverified,
    ]);

    $this->actingAs($owner)
        ->get('/employer/jobs')
        ->assertRedirect('/employer/company/verification');
});

test('verified company gets recruiter access even when status is still pending', function () {
    ['owner' => $owner] = employerWithCompany([
        'status' => CompanyStatus::Pending,
        'verification_status' => CompanyVerificationStatus::Verified,
        'verified_at' => now(),
    ]);

    $this->actingAs($owner)->get('/employer/jobs')->assertOk();
});

test('suspended company is blocked even when verified', function () {
    ['owner' => $owner] = employerWithCompany([
        'status' => CompanyStatus::Suspended,
        'verification_status' => CompanyVerificationStatus::Verified,
        'verified_at' => now(),
    ]);

    $this->actingAs($owner)
        ->get('/employer/jobs')
        ->assertRedirect('/employer/company/verification');
});

test('hasRecruiterAccess reflects approved, verified, and suspended states', function () {
    $approved = Company::factory()->make(['status' => CompanyStatus::Approved, 'verification_status' => CompanyVerificationStatus::Unverified]);
    $verifiedPending = Company::factory()->make(['status' => CompanyStatus::Pending, 'verification_status' => CompanyVerificationStatus::Verified]);
    $pending = Company::factory()->make(['status' => CompanyStatus::Pending, 'verification_status' => CompanyVerificationStatus::Unverified]);
    $suspendedVerified = Company::factory()->make(['status' => CompanyStatus::Suspended, 'verification_status' => CompanyVerificationStatus::Verified]);

    expect($approved->hasRecruiterAccess())->toBeTrue()
        ->and($verifiedPending->hasRecruiterAccess())->toBeTrue()
        ->and($pending->hasRecruiterAccess())->toBeFalse()
        ->and($suspendedVerified->hasRecruiterAccess())->toBeFalse();
});

test('recruiterActive scope includes verified-pending and excludes suspended and plain pending', function () {
    $approved = Company::factory()->create(['status' => CompanyStatus::Approved]);
    $verifiedPending = Company::factory()->create(['status' => CompanyStatus::Pending, 'verification_status' => CompanyVerificationStatus::Verified]);
    Company::factory()->create(['status' => CompanyStatus::Pending, 'verification_status' => CompanyVerificationStatus::Unverified]);
    Company::factory()->create(['status' => CompanyStatus::Suspended, 'verification_status' => CompanyVerificationStatus::Verified]);

    $ids = Company::query()->recruiterActive()->pluck('id');

    expect($ids)->toContain($approved->id)
        ->and($ids)->toContain($verifiedPending->id)
        ->and($ids->count())->toBe(2);
});
