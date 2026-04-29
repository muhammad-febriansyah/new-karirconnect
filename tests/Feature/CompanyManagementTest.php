<?php

use App\Enums\CompanyStatus;
use App\Models\Company;
use App\Models\CompanyBadge;
use App\Models\CompanyMember;
use App\Models\CompanyOffice;
use App\Models\User;
use App\Notifications\CompanyApproved;
use App\Notifications\CompanyStatusChangedNotification;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed([
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);
});

test('employer can register and view company pages', function () {
    $employer = User::factory()->employer()->create([
        'email_verified_at' => now(),
    ]);

    $this->actingAs($employer)
        ->post(route('employer.company.store'), [
            'name' => 'PT Karir Sprint Tiga',
            'industry_id' => null,
            'company_size_id' => null,
            'website' => 'https://karir-sprint.test',
            'email' => 'hr@karir-sprint.test',
            'phone' => '021-0000000',
        ])
        ->assertRedirect();

    $company = Company::query()->firstOrFail();

    expect($company->owner_id)->toBe($employer->id)
        ->and($company->status)->toBe(CompanyStatus::Pending);

    $this->assertDatabaseHas('company_members', [
        'company_id' => $company->id,
        'user_id' => $employer->id,
        'role' => 'owner',
    ]);

    $this->actingAs($employer)
        ->get(route('employer.company.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('employer/company/edit')
            ->where('company.name', 'PT Karir Sprint Tiga'));

    $this->actingAs($employer)
        ->get(route('employer.team.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('employer/team'));
});

test('employer can update company profile and offices', function () {
    Storage::fake('public');

    $employer = User::factory()->employer()->create([
        'email_verified_at' => now(),
    ]);

    $company = Company::factory()->for($employer, 'owner')->create();
    CompanyMember::factory()->owner()->create([
        'company_id' => $company->id,
        'user_id' => $employer->id,
    ]);

    $this->actingAs($employer)
        ->patch(route('employer.company.update'), [
            'name' => 'PT Karir Update',
            'slug' => 'pt-karir-update',
            'tagline' => 'Hiring platform',
            'website' => 'https://karir-update.test',
            'email' => 'hello@karir-update.test',
            'phone' => '021-777777',
            'industry_id' => 1,
            'company_size_id' => 1,
            'founded_year' => 2022,
            'province_id' => 1,
            'city_id' => 1,
            'address' => 'Jakarta Selatan',
            'about' => '<script>alert(1)</script><p>About aman</p>',
            'culture' => '<p>Culture aman</p>',
            'benefits' => '<p>Benefit aman</p>',
            'logo' => UploadedFile::fake()->image('logo.png', 200, 200),
            'cover' => UploadedFile::fake()->image('cover.png', 1200, 500),
            'offices' => [
                [
                    'label' => 'Kantor Pusat',
                    'province_id' => 1,
                    'city_id' => 1,
                    'address' => 'Jl. Sudirman No. 1',
                    'contact_phone' => '021-111111',
                    'map_url' => 'https://maps.example.test/hq',
                    'is_headquarter' => true,
                ],
                [
                    'label' => 'Kantor Bandung',
                    'province_id' => 1,
                    'city_id' => 2,
                    'address' => 'Jl. Asia Afrika No. 2',
                    'contact_phone' => '022-222222',
                    'map_url' => 'https://maps.example.test/bdg',
                    'is_headquarter' => false,
                ],
            ],
        ])
        ->assertRedirect();

    $company->refresh();

    expect($company->name)->toBe('PT Karir Update')
        ->and($company->slug)->toBe('pt-karir-update')
        ->and($company->about)->not->toContain('<script>');

    expect(CompanyOffice::query()->where('company_id', $company->id)->count())->toBe(2);

    $headquarter = CompanyOffice::query()
        ->where('company_id', $company->id)
        ->where('is_headquarter', true)
        ->first();

    expect($headquarter?->label)->toBe('Kantor Pusat');

    Storage::disk('public')->assertExists($company->fresh()->logo_path);
    Storage::disk('public')->assertExists($company->fresh()->cover_path);
});

test('employer can invite and remove team members', function () {
    $owner = User::factory()->employer()->create([
        'email_verified_at' => now(),
    ]);
    $memberUser = User::factory()->employer()->create([
        'email_verified_at' => now(),
    ]);

    $company = Company::factory()->for($owner, 'owner')->create();
    CompanyMember::factory()->owner()->create([
        'company_id' => $company->id,
        'user_id' => $owner->id,
    ]);

    $this->actingAs($owner)
        ->post(route('employer.team.store'), [
            'email' => $memberUser->email,
            'role' => 'admin',
        ])
        ->assertRedirect();

    $member = CompanyMember::query()
        ->where('company_id', $company->id)
        ->where('user_id', $memberUser->id)
        ->firstOrFail();

    expect($member->role)->toBe('admin');

    $this->actingAs($owner)
        ->delete(route('employer.team.destroy', $member))
        ->assertRedirect();

    $this->assertDatabaseMissing('company_members', [
        'id' => $member->id,
    ]);
});

test('admin can approve and suspend company with notifications', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create([
        'email_verified_at' => now(),
    ]);
    $owner = User::factory()->employer()->create([
        'email_verified_at' => now(),
    ]);

    $company = Company::factory()->for($owner, 'owner')->create([
        'status' => CompanyStatus::Pending,
    ]);
    CompanyMember::factory()->owner()->create([
        'company_id' => $company->id,
        'user_id' => $owner->id,
    ]);

    $this->actingAs($admin)
        ->post(route('admin.companies.approve', $company))
        ->assertRedirect();

    $company->refresh();

    expect($company->status)->toBe(CompanyStatus::Approved)
        ->and($company->approved_at)->not->toBeNull();

    Notification::assertSentTo($owner, CompanyApproved::class);
    $this->assertDatabaseHas('company_badges', [
        'company_id' => $company->id,
        'code' => 'approved-company',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.companies.suspend', $company))
        ->assertRedirect();

    expect($company->fresh()->status)->toBe(CompanyStatus::Suspended);

    Notification::assertSentTo($owner, CompanyStatusChangedNotification::class);
});

test('admin can browse company pages', function () {
    $admin = User::factory()->admin()->create([
        'email_verified_at' => now(),
    ]);
    $owner = User::factory()->employer()->create([
        'email_verified_at' => now(),
    ]);

    $company = Company::factory()->for($owner, 'owner')->approved()->create();
    CompanyMember::factory()->owner()->create([
        'company_id' => $company->id,
        'user_id' => $owner->id,
    ]);
    CompanyBadge::factory()->create([
        'company_id' => $company->id,
        'code' => 'top-responder',
        'name' => 'Top Responder',
    ]);
    CompanyOffice::factory()->create([
        'company_id' => $company->id,
        'label' => 'Kantor Pusat',
        'is_headquarter' => true,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.companies.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/companies/index'));

    $this->actingAs($admin)
        ->get(route('admin.companies.show', $company))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/companies/show')
            ->where('company.name', $company->name)
            ->has('company.offices', 1)
            ->has('company.badges', 1));
});
