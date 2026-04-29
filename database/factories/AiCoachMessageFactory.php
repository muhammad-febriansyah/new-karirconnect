<?php

namespace Database\Factories;

use App\Models\AiCoachMessage;
use App\Models\AiCoachSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiCoachMessage>
 */
class AiCoachMessageFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'session_id' => AiCoachSession::factory(),
            'role' => fake()->randomElement(['user', 'assistant']),
            'content' => fake()->paragraph(),
            'tokens_used' => 80,
            'model_snapshot' => 'fake-model-1',
            'created_at' => now(),
        ];
    }
}
