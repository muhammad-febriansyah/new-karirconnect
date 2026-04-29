<?php

namespace Database\Factories;

use App\Enums\ExperienceLevel;
use App\Enums\Gender;
use App\Models\City;
use App\Models\EmployeeProfile;
use App\Models\Province;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmployeeProfile>
 */
class EmployeeProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->employee(),
            'headline' => fake()->sentence(6),
            'about' => fake()->paragraph(),
            'date_of_birth' => fake()->dateTimeBetween('-35 years', '-20 years'),
            'gender' => fake()->randomElement(Gender::cases()),
            'province_id' => fn (): mixed => Province::query()->inRandomOrder()->value('id') ?? Province::factory(),
            'city_id' => fn (): mixed => City::query()->inRandomOrder()->value('id') ?? City::factory(),
            'current_position' => fake()->jobTitle(),
            'expected_salary_min' => 6000000,
            'expected_salary_max' => 10000000,
            'experience_level' => fake()->randomElement(ExperienceLevel::cases()),
            'primary_resume_id' => null,
            'portfolio_url' => fake()->url(),
            'linkedin_url' => fake()->url(),
            'github_url' => fake()->url(),
            'profile_completion' => 80,
            'is_open_to_work' => true,
            'visibility' => 'public',
            'cv_builder_json' => null,
        ];
    }
}
