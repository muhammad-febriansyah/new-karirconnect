<?php

namespace Database\Factories;

use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewResponse;
use App\Models\AiInterviewSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiInterviewResponse>
 */
class AiInterviewResponseFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'session_id' => AiInterviewSession::factory(),
            'question_id' => AiInterviewQuestion::factory(),
            'answer_text' => fake()->paragraph(),
            'duration_seconds' => 90,
            'ai_score' => 70,
            'sub_scores' => ['relevance' => 75, 'clarity' => 70, 'depth' => 65],
            'ai_feedback' => fake()->sentence(),
            'evaluated_at' => now(),
        ];
    }
}
