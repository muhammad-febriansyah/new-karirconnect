<?php

namespace Database\Factories;

use App\Models\AiInterviewAnalysis;
use App\Models\AiInterviewSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiInterviewAnalysis>
 */
class AiInterviewAnalysisFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'session_id' => AiInterviewSession::factory(),
            'overall_score' => 75,
            'fit_score' => 80,
            'recommendation' => 'hire',
            'summary' => fake()->paragraph(),
            'strengths' => ['Strong technical foundation', 'Clear communication'],
            'weaknesses' => ['Could deepen system design knowledge'],
            'communication_score' => 80,
            'technical_score' => 75,
            'problem_solving_score' => 70,
            'culture_fit_score' => 80,
            'generated_at' => now(),
        ];
    }
}
