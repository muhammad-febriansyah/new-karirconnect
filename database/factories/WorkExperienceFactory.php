<?php

namespace Database\Factories;

use App\Enums\EmploymentType;
use App\Models\EmployeeProfile;
use App\Models\WorkExperience;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkExperience>
 */
class WorkExperienceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'employee_profile_id' => EmployeeProfile::factory(),
            'company_name' => fake()->company(),
            'position' => fake()->jobTitle(),
            'employment_type' => fake()->randomElement(EmploymentType::cases()),
            'start_date' => '2022-07-01',
            'end_date' => '2024-07-01',
            'is_current' => false,
            'description' => fake()->paragraph(),
        ];
    }
}
