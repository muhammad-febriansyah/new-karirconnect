<?php

namespace Database\Factories;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Message>
 */
class MessageFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'conversation_id' => Conversation::factory(),
            'sender_user_id' => User::factory(),
            'body' => fake()->paragraph(),
            'attachments' => null,
            'is_system' => false,
            'read_at' => null,
        ];
    }

    public function system(): self
    {
        return $this->state(fn () => ['is_system' => true]);
    }
}
