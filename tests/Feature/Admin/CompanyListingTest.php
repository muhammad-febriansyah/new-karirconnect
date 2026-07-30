<?php

use App\Enums\CompanyStatus;
use App\Enums\CompanyVerificationStatus;
use App\Models\Company;
use App\Models\User;

/**
 * The listing used to paginate on the client, which meant the search box only
 * ever looked at the rows already on screen and the pages past the first were
 * unreachable. These tests pin the filtering and paging to the server.
 */
test('every company is reachable through pagination', function (): void {
    $admin = User::factory()->admin()->create();
    Company::factory()->count(30)->create();

    $this->actingAs($admin)
        ->get(route('admin.companies.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/companies/index')
            ->has('companies.data', 12)
            ->where('companies.total', 30)
            ->where('companies.current_page', 1)
            ->where('companies.last_page', 3));

    $this->actingAs($admin)
        ->get(route('admin.companies.index', ['page' => 3]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('companies.data', 6)
            ->where('companies.current_page', 3));
});

test('search reaches companies that are not on the first page', function (): void {
    $admin = User::factory()->admin()->create();

    // Created first, so the newest-first ordering pushes it well past page one.
    $target = Company::factory()->create([
        'name' => 'Percetakan Sinar Abadi',
        'created_at' => now()->subYear(),
    ]);
    Company::factory()->count(30)->create();

    $this->actingAs($admin)
        ->get(route('admin.companies.index', ['search' => 'Sinar Abadi']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('companies.total', 1)
            ->has('companies.data', 1)
            ->where('companies.data.0.id', $target->id));
});

test('search also matches the owner name and email', function (): void {
    $admin = User::factory()->admin()->create();

    $owner = User::factory()->employer()->create([
        'name' => 'Dewi Kartika',
        'email' => 'dewi@perusahaanku.co.id',
    ]);
    $target = Company::factory()->create(['owner_id' => $owner->id, 'name' => 'Aneka Jaya']);
    Company::factory()->count(3)->create();

    $this->actingAs($admin)
        ->get(route('admin.companies.index', ['search' => 'Dewi Kartika']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('companies.data', 1)
            ->where('companies.data.0.id', $target->id));

    $this->actingAs($admin)
        ->get(route('admin.companies.index', ['search' => 'dewi@perusahaanku']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('companies.data', 1)
            ->where('companies.data.0.id', $target->id));
});

test('status and verification filters narrow the listing', function (): void {
    $admin = User::factory()->admin()->create();

    Company::factory()->count(2)->create([
        'status' => CompanyStatus::Approved,
        'verification_status' => CompanyVerificationStatus::Verified,
    ]);
    Company::factory()->count(3)->create([
        'status' => CompanyStatus::Pending,
        'verification_status' => CompanyVerificationStatus::Unverified,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.companies.index', ['status' => 'approved']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('companies.total', 2)
            ->where('filters.status', 'approved'));

    $this->actingAs($admin)
        ->get(route('admin.companies.index', ['verification' => 'unverified']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('companies.total', 3));

    // The two filters combine rather than replace each other.
    $this->actingAs($admin)
        ->get(route('admin.companies.index', ['status' => 'approved', 'verification' => 'unverified']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('companies.total', 0));
});

test('an unknown filter value is ignored instead of emptying the listing', function (): void {
    $admin = User::factory()->admin()->create();
    Company::factory()->count(4)->create();

    $this->actingAs($admin)
        ->get(route('admin.companies.index', ['status' => 'not-a-status']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('companies.total', 4)
            ->where('filters.status', ''));
});

test('each card carries the fields it renders', function (): void {
    $admin = User::factory()->admin()->create();
    $owner = User::factory()->employer()->create(['name' => 'Budi Santoso']);
    Company::factory()->create(['owner_id' => $owner->id, 'name' => 'Karya Mandiri']);

    $this->actingAs($admin)
        ->get(route('admin.companies.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('companies.data.0.name', 'Karya Mandiri')
            ->where('companies.data.0.owner.name', 'Budi Santoso')
            ->has('companies.data.0.logo_url')
            ->has('companies.data.0.members_count')
            ->has('companies.data.0.jobs_count')
            ->has('companies.data.0.verification_status')
            ->has('statusOptions')
            ->has('verificationOptions'));
});

test('filters survive a page change', function (): void {
    $admin = User::factory()->admin()->create();
    Company::factory()->count(20)->create(['status' => CompanyStatus::Approved]);
    Company::factory()->count(5)->create(['status' => CompanyStatus::Suspended]);

    $this->actingAs($admin)
        ->get(route('admin.companies.index', ['status' => 'approved', 'page' => 2]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('companies.total', 20)
            ->has('companies.data', 8)
            ->where('filters.status', 'approved'));
});
