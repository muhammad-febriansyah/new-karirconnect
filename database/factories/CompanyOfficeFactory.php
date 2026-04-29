<?php

namespace Database\Factories;

use App\Models\City;
use App\Models\Company;
use App\Models\CompanyOffice;
use App\Models\Province;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyOffice>
 */
class CompanyOfficeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'label' => fake()->randomElement(['Kantor Pusat', 'Kantor Cabang Jakarta', 'Kantor Operasional']),
            'province_id' => Province::query()->inRandomOrder()->value('id') ?? Province::factory(),
            'city_id' => City::query()->inRandomOrder()->value('id') ?? City::factory(),
            'address' => fake()->address(),
            'contact_phone' => fake()->phoneNumber(),
            'map_url' => fake()->url(),
            'is_headquarter' => false,
        ];
    }
}
