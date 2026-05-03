<?php

use App\Models\Company;
use App\Models\CompanyOffice;
use App\Models\User;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([
        SettingSeeder::class,
        ProvinceCitySeeder::class,
    ]);
});

test('employer can list their company offices', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    CompanyOffice::factory()->count(2)->create(['company_id' => $company->id]);

    $this->actingAs($owner)
        ->get(route('employer.company-offices.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('employer/company-offices/index')
            ->has('offices', 2));
});

test('employer can create a new company office', function () {
    $owner = User::factory()->employer()->create();
    Company::factory()->approved()->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->post(route('employer.company-offices.store'), [
            'label' => 'Kantor Jakarta',
            'address' => 'Jl. Sudirman No. 1',
            'is_headquarter' => true,
        ])
        ->assertRedirect(route('employer.company-offices.index'));

    expect(CompanyOffice::query()->where('label', 'Kantor Jakarta')->exists())->toBeTrue();
});

test('marking an office as headquarter unsets the previous headquarter', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $previous = CompanyOffice::factory()->create(['company_id' => $company->id, 'is_headquarter' => true, 'label' => 'Lama']);

    $this->actingAs($owner)
        ->post(route('employer.company-offices.store'), [
            'label' => 'Baru',
            'is_headquarter' => true,
        ])
        ->assertRedirect();

    expect($previous->fresh()->is_headquarter)->toBeFalse();
    expect(CompanyOffice::query()->where('label', 'Baru')->where('is_headquarter', true)->exists())->toBeTrue();
});

test('employer cannot edit another company office', function () {
    $ownerA = User::factory()->employer()->create();
    $ownerB = User::factory()->employer()->create();
    $companyA = Company::factory()->approved()->create(['owner_id' => $ownerA->id]);
    Company::factory()->approved()->create(['owner_id' => $ownerB->id]);
    $office = CompanyOffice::factory()->create(['company_id' => $companyA->id]);

    $this->actingAs($ownerB)
        ->get(route('employer.company-offices.edit', ['office' => $office->id]))
        ->assertNotFound();
});

test('employer can update and delete their office', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $office = CompanyOffice::factory()->create(['company_id' => $company->id, 'label' => 'Lama', 'is_headquarter' => false]);

    $this->actingAs($owner)
        ->patch(route('employer.company-offices.update', ['office' => $office->id]), [
            'label' => 'Diperbarui',
            'is_headquarter' => false,
        ])
        ->assertRedirect();

    expect($office->fresh()->label)->toBe('Diperbarui');

    $this->actingAs($owner)
        ->delete(route('employer.company-offices.destroy', ['office' => $office->id]))
        ->assertRedirect();

    expect(CompanyOffice::query()->whereKey($office->id)->exists())->toBeFalse();
});
