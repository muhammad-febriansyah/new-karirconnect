<?php

namespace Database\Factories;

use App\Models\Conversation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Conversation>
 */
class ConversationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => 'direct',
            'context_type' => null,
            'context_id' => null,
            'subject' => fake()->sentence(4),
            'last_message_at' => null,
        ];
    }

    public function direct(): self
    {
        return $this->state(fn () => ['type' => 'direct']);
    }

    public function interview(): self
    {
        return $this->state(fn () => ['type' => 'interview']);
    }
}
