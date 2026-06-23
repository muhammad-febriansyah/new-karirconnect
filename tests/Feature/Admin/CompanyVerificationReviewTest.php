<?php

use App\Enums\CompanyStatus;
use App\Enums\CompanyVerificationStatus;
use App\Enums\ReviewStatus;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\User;
use App\Notifications\CompanyVerified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

function pendingCompanyWithDocument(): array
{
    $owner = User::factory()->employer()->create(['email_verified_at' => now()]);

    $company = Company::factory()->for($owner, 'owner')->create([
        'status' => CompanyStatus::Pending,
        'verification_status' => CompanyVerificationStatus::Pending,
        'approved_at' => null,
        'verified_at' => null,
        'onboarding_completed_at' => now(),
    ]);

    $document = CompanyVerification::factory()->create([
        'company_id' => $company->id,
        'uploaded_by_user_id' => $owner->id,
        'status' => ReviewStatus::Pending,
    ]);

    return [$owner, $company, $document];
}

test('approving a verification document also approves and verifies the company', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create(['email_verified_at' => now()]);
    [$owner, $company, $document] = pendingCompanyWithDocument();

    $this->actingAs($admin)
        ->post(route('admin.company-verifications.review', $document), [
            'decision' => 'approve',
        ])
        ->assertRedirect();

    $company->refresh();

    expect($company->verification_status)->toBe(CompanyVerificationStatus::Verified)
        ->and($company->verified_at)->not->toBeNull()
        ->and($company->status)->toBe(CompanyStatus::Approved)
        ->and($company->approved_at)->not->toBeNull()
        ->and($document->fresh()->status)->toBe(ReviewStatus::Approved);

    $this->assertDatabaseHas('company_badges', [
        'company_id' => $company->id,
        'code' => 'approved-company',
    ]);
    $this->assertDatabaseHas('company_badges', [
        'company_id' => $company->id,
        'code' => 'verified-employer',
    ]);

    Notification::assertSentTo($owner, CompanyVerified::class);
});

test('approved company unblocks employer features gated by EnsureCompanyApproved', function () {
    $admin = User::factory()->admin()->create(['email_verified_at' => now()]);
    [$owner, $company, $document] = pendingCompanyWithDocument();

    // Before approval the gate redirects away from job management.
    $this->actingAs($owner)
        ->get(route('employer.jobs.index'))
        ->assertRedirect('/employer/company/verification');

    $this->actingAs($admin)
        ->post(route('admin.company-verifications.review', $document), [
            'decision' => 'approve',
        ])
        ->assertRedirect();

    // After approval the same route is reachable.
    $this->actingAs($owner)
        ->get(route('employer.jobs.index'))
        ->assertOk();
});

test('rejecting the last approved document pulls the company back to pending', function () {
    $admin = User::factory()->admin()->create(['email_verified_at' => now()]);
    [$owner, $company, $document] = pendingCompanyWithDocument();

    $this->actingAs($admin)
        ->post(route('admin.company-verifications.review', $document), ['decision' => 'approve'])
        ->assertRedirect();

    expect($company->fresh()->status)->toBe(CompanyStatus::Approved);

    $this->actingAs($admin)
        ->post(route('admin.company-verifications.review', $document), ['decision' => 'reject'])
        ->assertRedirect();

    $company->refresh();

    expect($company->status)->toBe(CompanyStatus::Pending)
        ->and($company->approved_at)->toBeNull()
        ->and($company->verification_status)->toBe(CompanyVerificationStatus::Rejected);
});
