<?php

namespace Database\Factories;

use App\Models\EmployeeProfile;
use App\Models\Skill;
use App\Models\SkillAssessment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SkillAssessment>
 */
class SkillAssessmentFactory extends Factory
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
            'skill_id' => Skill::factory(),
            'status' => 'pending',
            'score' => null,
            'total_questions' => 5,
            'correct_answers' => 0,
            'started_at' => null,
            'completed_at' => null,
            'expires_at' => null,
        ];
    }
}
