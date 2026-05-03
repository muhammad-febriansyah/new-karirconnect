<?php

namespace Database\Factories;

use App\Models\AssessmentQuestion;
use App\Models\SkillAssessment;
use App\Models\SkillAssessmentAnswer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SkillAssessmentAnswer>
 */
class SkillAssessmentAnswerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'assessment_id' => SkillAssessment::factory(),
            'question_id' => AssessmentQuestion::factory(),
            'answer' => ['value' => fake()->word()],
            'is_correct' => fake()->boolean(),
            'time_spent_seconds' => fake()->numberBetween(10, 120),
            'created_at' => now(),
        ];
    }
}
