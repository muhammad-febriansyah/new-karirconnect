<?php

namespace Database\Factories;

use App\Models\AiCareerRecommendation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiCareerRecommendation>
 */
class AiCareerRecommendationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->employee(),
            'type' => 'skill_gap',
            'payload' => [
                'gaps' => ['system design', 'leadership'],
                'recommended_courses' => ['Designing Data-Intensive Applications'],
            ],
            'generated_at' => now(),
            'is_dismissed' => false,
        ];
    }
}
