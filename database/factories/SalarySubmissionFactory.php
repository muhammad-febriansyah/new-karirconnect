<?php

namespace Database\Factories;

use App\Enums\ExperienceLevel;
use App\Models\SalarySubmission;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SalarySubmission>
 */
class SalarySubmissionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->employee(),
            'company_id' => null,
            'job_category_id' => null,
            'city_id' => null,
            'province_id' => null,
            'job_title' => fake()->jobTitle(),
            'experience_level' => ExperienceLevel::Mid,
            'experience_years' => fake()->numberBetween(2, 8),
            'employment_type' => 'full_time',
            'salary_idr' => fake()->numberBetween(8000000, 30000000),
            'bonus_idr' => 0,
            'is_anonymous' => true,
            'is_verified' => false,
            'status' => 'approved',
        ];
    }
}
