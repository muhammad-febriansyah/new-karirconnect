<?php

use App\Enums\CompanyStatus;
use App\Enums\CompanyVerificationStatus;
use App\Enums\UserRole;
use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\Industry;
use App\Models\User;
use Database\Seeders\SubscriptionPlanSeeder;
use Illuminate\Support\Facades\Hash;

function adminUser(): User
{
    return User::factory()->create([
        'role' => UserRole::Admin,
        'email_verified_at' => now(),
    ]);
}

test('admin can open the create company page', function () {
    $this->actingAs(adminUser())
        ->get('/admin/companies/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/companies/create'));
});

test('admin creates a recruiter account that is approved, verified, and ready to post', function () {
    $industry = Industry::factory()->create();

    $this->actingAs(adminUser())
        ->post('/admin/companies', [
            'owner_name' => 'Budi Santoso',
            'owner_email' => 'budi@perusahaan.co.id',
            'owner_phone' => '+62 812 0000 0000',
            'password' => 'rahasia123',
            'name' => 'PT Simetric Consulting Group',
            'website' => 'https://simetric.co.id',
            'email' => 'info@simetric.co.id',
            'industry_id' => $industry->id,
            'mark_verified' => true,
        ])
        ->assertRedirect();

    $owner = User::query()->where('email', 'budi@perusahaan.co.id')->first();
    expect($owner)->not->toBeNull()
        ->and($owner->role)->toBe(UserRole::Employer)
        ->and($owner->email_verified_at)->not->toBeNull()
        ->and(Hash::check('rahasia123', $owner->password))->toBeTrue();

    $company = Company::query()->where('owner_id', $owner->id)->first();
    expect($company)->not->toBeNull()
        ->and($company->name)->toBe('PT Simetric Consulting Group')
        ->and($company->status)->toBe(CompanyStatus::Approved)
        ->and($company->verification_status)->toBe(CompanyVerificationStatus::Verified)
        ->and($company->approved_at)->not->toBeNull()
        ->and($company->verified_at)->not->toBeNull()
        ->and($company->hasRecruiterAccess())->toBeTrue();

    expect(CompanyMember::query()->where('company_id', $company->id)->where('user_id', $owner->id)->where('role', 'owner')->exists())->toBeTrue();
});

test('mark_verified=false still approves but leaves company unverified', function () {
    $this->actingAs(adminUser())
        ->post('/admin/companies', [
            'owner_name' => 'Sari',
            'owner_email' => 'sari@firma.co.id',
            'password' => 'rahasia123',
            'name' => 'Firma Sari',
            'mark_verified' => false,
        ])
        ->assertRedirect();

    $company = Company::query()->where('name', 'Firma Sari')->first();
    expect($company->status)->toBe(CompanyStatus::Approved)
        ->and($company->verification_status)->toBe(CompanyVerificationStatus::Unverified);
});

test('duplicate owner email is rejected', function () {
    User::factory()->create(['email' => 'taken@firma.co.id']);

    $this->actingAs(adminUser())
        ->post('/admin/companies', [
            'owner_name' => 'Dewi',
            'owner_email' => 'taken@firma.co.id',
            'password' => 'rahasia123',
            'name' => 'Firma Dewi',
        ])
        ->assertSessionHasErrors('owner_email');

    expect(Company::query()->where('name', 'Firma Dewi')->exists())->toBeFalse();
});

test('bare-domain website without a scheme is accepted and normalized', function () {
    $this->actingAs(adminUser())
        ->post('/admin/companies', [
            'owner_name' => 'Shafira',
            'owner_email' => 'shafira@kmd.co.id',
            'password' => 'rahasia123',
            'name' => 'PT KMD Indonesia',
            'website' => 'Kindocare.id',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $company = Company::query()->where('name', 'PT KMD Indonesia')->first();
    expect($company)->not->toBeNull()
        ->and($company->website)->toBe('https://Kindocare.id');
});

test('admin-created company gets a trial so it can post jobs immediately', function () {
    $this->seed(SubscriptionPlanSeeder::class);

    $this->actingAs(adminUser())
        ->post('/admin/companies', [
            'owner_name' => 'Rina',
            'owner_email' => 'rina@firma.co.id',
            'password' => 'rahasia123',
            'name' => 'Firma Rina',
        ])
        ->assertRedirect();

    $company = Company::query()->where('name', 'Firma Rina')->first();
    expect($company->activeSubscription())->not->toBeNull()
        ->and($company->activeSubscription()->plan->slug)->toBe('trial');
});

test('non-admin cannot access the create company endpoints', function () {
    $employer = User::factory()->employer()->create(['email_verified_at' => now()]);

    $this->actingAs($employer)->get('/admin/companies/create')->assertForbidden();

    $this->actingAs($employer)
        ->post('/admin/companies', [
            'owner_name' => 'X',
            'owner_email' => 'x@x.co.id',
            'password' => 'rahasia123',
            'name' => 'X Corp',
        ])
        ->assertForbidden();

    expect(User::query()->where('email', 'x@x.co.id')->exists())->toBeFalse();
});
