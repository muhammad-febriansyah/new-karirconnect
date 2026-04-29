<?php

namespace Database\Factories;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\EmployeeProfile;
use App\Models\Job;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Application>
 */
class ApplicationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'job_id' => Job::factory()->published(),
            'employee_profile_id' => EmployeeProfile::factory(),
            'candidate_cv_id' => null,
            'cover_letter' => fake()->paragraph(),
            'expected_salary' => fake()->numberBetween(5, 25) * 1_000_000,
            'status' => ApplicationStatus::Submitted,
            'applied_at' => now(),
        ];
    }

    public function reviewed(): self
    {
        return $this->state(fn () => [
            'status' => ApplicationStatus::Reviewed,
            'reviewed_at' => now(),
        ]);
    }
}
