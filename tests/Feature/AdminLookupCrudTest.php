<?php

use App\Models\City;
use App\Models\CompanySize;
use App\Models\Industry;
use App\Models\JobCategory;
use App\Models\Province;
use App\Models\Skill;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('non admin users cannot access lookup management pages', function () {
    $user = User::factory()->employee()->create();

    $this->actingAs($user)
        ->get(route('admin.job-categories.index'))
        ->assertForbidden();
});

test('location and lookup seeders populate baseline data', function () {
    $this->seed([
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);

    expect(Province::query()->count())->toBe(38)
        ->and(City::query()->where('is_capital', true)->count())->toBe(38)
        ->and(Industry::query()->count())->toBeGreaterThanOrEqual(10)
        ->and(CompanySize::query()->count())->toBe(5)
        ->and(JobCategory::query()->count())->toBeGreaterThanOrEqual(8)
        ->and(Skill::query()->count())->toBeGreaterThanOrEqual(20);
});

test('admin can manage job categories', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $this->get(route('admin.job-categories.index'))->assertOk();

    $this->post(route('admin.job-categories.store'), [
        'name' => 'Quality Assurance',
        'slug' => '',
        'description' => 'Role untuk testing dan quality.',
        'sort_order' => 3,
        'is_active' => true,
    ])->assertRedirect(route('admin.job-categories.index'));

    $jobCategory = JobCategory::query()->firstWhere('name', 'Quality Assurance');

    expect($jobCategory)->not->toBeNull()
        ->and($jobCategory->slug)->toBe('quality-assurance');

    $this->put(route('admin.job-categories.update', $jobCategory), [
        'name' => 'QA Engineering',
        'slug' => 'qa-engineering',
        'description' => 'Role untuk testing otomatis dan manual.',
        'sort_order' => 1,
        'is_active' => false,
    ])->assertRedirect(route('admin.job-categories.index'));

    $jobCategory->refresh();

    expect($jobCategory->name)->toBe('QA Engineering')
        ->and($jobCategory->is_active)->toBeFalse();

    $this->delete(route('admin.job-categories.destroy', $jobCategory))
        ->assertRedirect(route('admin.job-categories.index'));

    $this->assertDatabaseMissing('job_categories', [
        'id' => $jobCategory->id,
    ]);
});

test('admin can manage industries company sizes and skills', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $this->post(route('admin.industries.store'), [
        'name' => 'Agritech',
        'slug' => '',
        'description' => 'Teknologi untuk pertanian.',
        'sort_order' => 2,
        'is_active' => true,
    ])->assertRedirect(route('admin.industries.index'));

    $industry = Industry::query()->firstWhere('name', 'Agritech');

    $this->post(route('admin.company-sizes.store'), [
        'name' => '1000+ Karyawan',
        'slug' => '',
        'employee_range' => '1000+',
        'sort_order' => 6,
        'is_active' => true,
    ])->assertRedirect(route('admin.company-sizes.index'));

    $companySize = CompanySize::query()->firstWhere('name', '1000+ Karyawan');

    $this->post(route('admin.skills.store'), [
        'name' => 'Go',
        'slug' => '',
        'category' => 'Backend',
        'description' => 'Bahasa pemrograman untuk layanan backend.',
        'is_active' => true,
    ])->assertRedirect(route('admin.skills.index'));

    $skill = Skill::query()->firstWhere('name', 'Go');

    expect($industry?->slug)->toBe('agritech')
        ->and($companySize?->employee_range)->toBe('1000+')
        ->and($skill?->category)->toBe('Backend');
});
