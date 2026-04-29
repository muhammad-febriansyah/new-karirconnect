<?php

namespace Database\Factories;

use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiInterviewQuestion>
 */
class AiInterviewQuestionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'session_id' => AiInterviewSession::factory(),
            'order_number' => 1,
            'category' => 'technical',
            'question' => fake()->sentence().'?',
            'context' => null,
            'expected_keywords' => ['scalability', 'testing', 'maintainability'],
            'max_duration_seconds' => 120,
        ];
    }
}
