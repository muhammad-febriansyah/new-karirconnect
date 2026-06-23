<?php

use App\Models\City;
use App\Models\Province;
use Database\Seeders\ProvinceCitySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('seeds the full kabupaten/kota dataset per province', function (): void {
    $this->seed(ProvinceCitySeeder::class);

    $jawaBarat = Province::query()->where('name', 'Jawa Barat')->firstOrFail();

    // The legacy seeder only seeded the provincial capital; the dataset must now
    // expose every regency so the city dropdown is complete.
    expect(City::query()->where('province_id', $jawaBarat->id)->count())
        ->toBeGreaterThan(20)
        ->and(City::query()->where('province_id', $jawaBarat->id)->where('name', 'Kabupaten Bekasi')->exists())
        ->toBeTrue()
        ->and(City::query()->where('province_id', $jawaBarat->id)->where('name', 'Kota Depok')->exists())
        ->toBeTrue();
});

it('keeps every province flagged with exactly one capital and no duplicate cities', function (): void {
    $this->seed(ProvinceCitySeeder::class);

    expect(Province::query()->count())->toBe(38);

    // One capital per province.
    expect(City::query()->where('is_capital', true)->count())
        ->toBe(Province::query()->count());

    // The (province_id, name) unique index must hold — no duplicated cities.
    $duplicates = City::query()
        ->selectRaw('province_id, name, COUNT(*) as total')
        ->groupBy('province_id', 'name')
        ->havingRaw('COUNT(*) > 1')
        ->get();

    expect($duplicates)->toBeEmpty();
});

it('is idempotent and preserves existing city ids on re-run', function (): void {
    $this->seed(ProvinceCitySeeder::class);

    $before = City::query()->orderBy('id')->pluck('id', 'name');
    $countBefore = City::query()->count();

    $this->seed(ProvinceCitySeeder::class);

    expect(City::query()->count())->toBe($countBefore)
        ->and(City::query()->orderBy('id')->pluck('id', 'name'))->toEqual($before);
});
