<?php

namespace Database\Factories;

use App\Models\AiMatchScore;
use App\Models\EmployeeProfile;
use App\Models\Job;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiMatchScore>
 */
class AiMatchScoreFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'job_id' => Job::factory()->published(),
            'candidate_profile_id' => EmployeeProfile::factory(),
            'score' => 72,
            'breakdown' => ['skills' => 35, 'experience' => 15, 'location' => 10, 'salary' => 12],
            'computed_at' => now(),
        ];
    }
}
