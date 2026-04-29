<?php

namespace Database\Factories;

use App\Models\AiCoachSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiCoachSession>
 */
class AiCoachSessionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->employee(),
            'title' => 'Coaching - '.fake()->word(),
            'status' => 'active',
            'last_message_at' => now(),
        ];
    }
}
