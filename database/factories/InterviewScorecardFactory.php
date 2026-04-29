<?php

namespace Database\Factories;

use App\Models\Interview;
use App\Models\InterviewScorecard;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InterviewScorecard>
 */
class InterviewScorecardFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'interview_id' => Interview::factory(),
            'reviewer_id' => User::factory()->employer(),
            'overall_score' => fake()->numberBetween(2, 5),
            'recommendation' => fake()->randomElement(['strong_yes', 'yes', 'no', 'strong_no']),
            'criteria_scores' => [
                'technical' => fake()->numberBetween(1, 5),
                'communication' => fake()->numberBetween(1, 5),
                'culture' => fake()->numberBetween(1, 5),
            ],
            'strengths' => fake()->sentence(),
            'weaknesses' => fake()->sentence(),
            'comments' => fake()->paragraph(),
            'submitted_at' => now(),
        ];
    }
}
