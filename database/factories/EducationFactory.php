<?php

namespace Database\Factories;

use App\Enums\EducationLevel;
use App\Models\Education;
use App\Models\EmployeeProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Education>
 */
class EducationFactory extends Factory
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
            'level' => fake()->randomElement([
                EducationLevel::SMA,
                EducationLevel::D3,
                EducationLevel::S1,
                EducationLevel::S2,
            ]),
            'institution' => fake()->company().' University',
            'major' => fake()->randomElement(['Teknik Informatika', 'Sistem Informasi', 'Desain Komunikasi Visual']),
            'gpa' => 3.75,
            'start_year' => 2018,
            'end_year' => 2022,
            'description' => fake()->sentence(),
        ];
    }
}
