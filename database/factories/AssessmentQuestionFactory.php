<?php

namespace Database\Factories;

use App\Models\AssessmentQuestion;
use App\Models\Skill;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AssessmentQuestion>
 */
class AssessmentQuestionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'skill_id' => Skill::factory(),
            'type' => 'multiple_choice',
            'question' => fake()->sentence(12),
            'options' => ['Laravel', 'React', 'Docker', 'Postman'],
            'correct_answer' => ['value' => 'Laravel'],
            'difficulty' => fake()->randomElement(['easy', 'medium', 'hard']),
            'time_limit_seconds' => fake()->numberBetween(60, 600),
            'is_active' => true,
        ];
    }
}
