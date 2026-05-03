<?php

namespace Database\Factories;

use App\Enums\ExperienceLevel;
use App\Models\City;
use App\Models\SalaryInsight;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SalaryInsight>
 */
class SalaryInsightFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'job_title' => fake()->jobTitle(),
            'role_category' => fake()->randomElement(['Software Engineering', 'Data dan AI', 'Design']),
            'city_id' => fn (): mixed => City::query()->inRandomOrder()->value('id') ?? City::factory(),
            'experience_level' => fake()->randomElement(ExperienceLevel::cases()),
            'min_salary' => 8000000,
            'median_salary' => 12000000,
            'max_salary' => 18000000,
            'sample_size' => fake()->numberBetween(5, 50),
            'source' => fake()->randomElement(['manual', 'survey', 'partner']),
            'last_updated_at' => now(),
        ];
    }
}
