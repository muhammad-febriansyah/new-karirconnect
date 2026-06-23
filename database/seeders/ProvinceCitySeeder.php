<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Province;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use RuntimeException;

class ProvinceCitySeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $provinces = collect($this->definitions());

        Province::query()->upsert(
            $provinces->map(fn (array $province): array => [
                'code' => $province['code'],
                'name' => $province['name'],
                'created_at' => $now,
                'updated_at' => $now,
            ])->all(),
            uniqueBy: ['code'],
            update: ['name', 'updated_at'],
        );

        /** @var Collection<string, int> $provinceIdByCode */
        $provinceIdByCode = Province::query()->pluck('id', 'code');
        /** @var Collection<string, int> $provinceIdByName */
        $provinceIdByName = Province::query()->pluck('id', 'name');

        $cities = $this->cityDefinitions();

        // Reconcile legacy capital rows (seeded as the bare city name, e.g. "Medan")
        // with the canonical dataset name (e.g. "Kota Medan") *before* upserting so
        // the existing row is updated in place — preserving its id and any foreign
        // keys (companies.city_id, jobs.city_id, …) instead of leaving a duplicate.
        foreach ($provinces as $province) {
            $provinceId = $provinceIdByCode[$province['code']];
            $canonicalCapital = 'Kota '.$province['capital'];

            if (! $cities->get($province['name'], collect())->contains($canonicalCapital)) {
                continue;
            }

            City::query()
                ->where('province_id', $provinceId)
                ->where('name', $province['capital'])
                ->update(['name' => $canonicalCapital, 'is_capital' => true]);
        }

        // Ensure every province keeps at least its capital (covers provinces with no
        // entry in the regency dataset, e.g. the post-2022 Papua provinces).
        City::query()->upsert(
            $provinces->map(fn (array $province): array => [
                'province_id' => $provinceIdByCode[$province['code']],
                'name' => $cities->get($province['name'], collect())->contains('Kota '.$province['capital'])
                    ? 'Kota '.$province['capital']
                    : $province['capital'],
                'is_capital' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all(),
            uniqueBy: ['province_id', 'name'],
            update: ['is_capital', 'updated_at'],
        );

        $rows = [];

        foreach ($cities as $provinceName => $cityNames) {
            $provinceId = $provinceIdByName[$provinceName] ?? null;

            if ($provinceId === null) {
                throw new RuntimeException("Unknown province in cities dataset: {$provinceName}");
            }

            foreach ($cityNames as $cityName) {
                $rows[] = [
                    'province_id' => $provinceId,
                    'name' => $cityName,
                    'is_capital' => false,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            City::query()->upsert(
                $chunk,
                uniqueBy: ['province_id', 'name'],
                update: ['updated_at'],
            );
        }
    }

    /**
     * Full regency/city dataset (kabupaten & kota) keyed by province name.
     *
     * Sourced from the public Indonesian administrative-region dataset and
     * bundled at database/data/indonesia_cities.json so seeding stays offline
     * and reproducible.
     *
     * @return Collection<string, Collection<int, string>>
     */
    private function cityDefinitions(): Collection
    {
        $path = database_path('data/indonesia_cities.json');

        if (! is_file($path)) {
            throw new RuntimeException("Missing cities dataset: {$path}");
        }

        /** @var array<string, array<int, string>> $data */
        $data = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);

        return collect($data)->map(fn (array $names): Collection => collect($names));
    }

    /**
     * @return array<int, array{code: string, name: string, capital: string}>
     */
    private function definitions(): array
    {
        return [
            ['code' => 'ID-AC', 'name' => 'Aceh', 'capital' => 'Banda Aceh'],
            ['code' => 'ID-SU', 'name' => 'Sumatera Utara', 'capital' => 'Medan'],
            ['code' => 'ID-SB', 'name' => 'Sumatera Barat', 'capital' => 'Padang'],
            ['code' => 'ID-RI', 'name' => 'Riau', 'capital' => 'Pekanbaru'],
            ['code' => 'ID-JA', 'name' => 'Jambi', 'capital' => 'Jambi'],
            ['code' => 'ID-SS', 'name' => 'Sumatera Selatan', 'capital' => 'Palembang'],
            ['code' => 'ID-BE', 'name' => 'Bengkulu', 'capital' => 'Bengkulu'],
            ['code' => 'ID-LA', 'name' => 'Lampung', 'capital' => 'Bandar Lampung'],
            ['code' => 'ID-BB', 'name' => 'Kepulauan Bangka Belitung', 'capital' => 'Pangkalpinang'],
            ['code' => 'ID-KR', 'name' => 'Kepulauan Riau', 'capital' => 'Tanjungpinang'],
            ['code' => 'ID-JK', 'name' => 'DKI Jakarta', 'capital' => 'Jakarta'],
            ['code' => 'ID-JB', 'name' => 'Jawa Barat', 'capital' => 'Bandung'],
            ['code' => 'ID-JT', 'name' => 'Jawa Tengah', 'capital' => 'Semarang'],
            ['code' => 'ID-YO', 'name' => 'DI Yogyakarta', 'capital' => 'Yogyakarta'],
            ['code' => 'ID-JI', 'name' => 'Jawa Timur', 'capital' => 'Surabaya'],
            ['code' => 'ID-BT', 'name' => 'Banten', 'capital' => 'Serang'],
            ['code' => 'ID-BA', 'name' => 'Bali', 'capital' => 'Denpasar'],
            ['code' => 'ID-NB', 'name' => 'Nusa Tenggara Barat', 'capital' => 'Mataram'],
            ['code' => 'ID-NT', 'name' => 'Nusa Tenggara Timur', 'capital' => 'Kupang'],
            ['code' => 'ID-KB', 'name' => 'Kalimantan Barat', 'capital' => 'Pontianak'],
            ['code' => 'ID-KT', 'name' => 'Kalimantan Tengah', 'capital' => 'Palangka Raya'],
            ['code' => 'ID-KS', 'name' => 'Kalimantan Selatan', 'capital' => 'Banjarbaru'],
            ['code' => 'ID-KI', 'name' => 'Kalimantan Timur', 'capital' => 'Samarinda'],
            ['code' => 'ID-KU', 'name' => 'Kalimantan Utara', 'capital' => 'Tanjung Selor'],
            ['code' => 'ID-SA', 'name' => 'Sulawesi Utara', 'capital' => 'Manado'],
            ['code' => 'ID-ST', 'name' => 'Sulawesi Tengah', 'capital' => 'Palu'],
            ['code' => 'ID-SN', 'name' => 'Sulawesi Selatan', 'capital' => 'Makassar'],
            ['code' => 'ID-SG', 'name' => 'Sulawesi Tenggara', 'capital' => 'Kendari'],
            ['code' => 'ID-GO', 'name' => 'Gorontalo', 'capital' => 'Gorontalo'],
            ['code' => 'ID-SR', 'name' => 'Sulawesi Barat', 'capital' => 'Mamuju'],
            ['code' => 'ID-MA', 'name' => 'Maluku', 'capital' => 'Ambon'],
            ['code' => 'ID-MU', 'name' => 'Maluku Utara', 'capital' => 'Sofifi'],
            ['code' => 'ID-PA', 'name' => 'Papua', 'capital' => 'Jayapura'],
            ['code' => 'ID-PB', 'name' => 'Papua Barat', 'capital' => 'Manokwari'],
            ['code' => 'ID-PS', 'name' => 'Papua Selatan', 'capital' => 'Merauke'],
            ['code' => 'ID-PT', 'name' => 'Papua Tengah', 'capital' => 'Nabire'],
            ['code' => 'ID-PE', 'name' => 'Papua Pegunungan', 'capital' => 'Wamena'],
            ['code' => 'ID-PD', 'name' => 'Papua Barat Daya', 'capital' => 'Sorong'],
        ];
    }
}
