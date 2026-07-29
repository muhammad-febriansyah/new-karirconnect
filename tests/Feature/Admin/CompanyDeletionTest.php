<?php

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;

test('admin can delete a company', function (): void {
    $admin = User::factory()->admin()->create();
    $company = Company::factory()->create();

    $this->actingAs($admin)
        ->delete(route('admin.companies.destroy', $company))
        ->assertRedirect(route('admin.companies.index'));

    expect(Company::query()->find($company->id))->toBeNull();
    expect(Company::withTrashed()->find($company->id))->not->toBeNull();
    expect(AuditLog::query()->where('action', 'company.delete')->exists())->toBeTrue();
});

test('deleted company disappears from the admin listing', function (): void {
    $admin = User::factory()->admin()->create();
    $company = Company::factory()->create();

    $this->actingAs($admin)->delete(route('admin.companies.destroy', $company));

    $this->actingAs($admin)
        ->get(route('admin.companies.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/companies/index')
            ->has('companies.data', 0));
});

test('non admin cannot delete a company', function (): void {
    $employer = User::factory()->employer()->create();
    $company = Company::factory()->create();

    $this->actingAs($employer)
        ->delete(route('admin.companies.destroy', $company))
        ->assertForbidden();

    expect(Company::query()->find($company->id))->not->toBeNull();
});

test('guest cannot delete a company', function (): void {
    $company = Company::factory()->create();

    $this->delete(route('admin.companies.destroy', $company))
        ->assertRedirect(route('login'));

    expect(Company::query()->find($company->id))->not->toBeNull();
});
