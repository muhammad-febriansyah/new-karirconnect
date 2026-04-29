<?php

namespace Database\Factories;

use App\Models\CompanySize;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<CompanySize>
 */
class CompanySizeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->randomElement([
            'Startup',
            'Skala Kecil',
            'Skala Menengah',
            'Skala Besar',
            'Enterprise',
        ]);

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'employee_range' => fake()->randomElement(['1-10', '11-50', '51-200', '201-500', '500+']),
            'is_active' => true,
            'sort_order' => fake()->numberBetween(1, 20),
        ];
    }
}
