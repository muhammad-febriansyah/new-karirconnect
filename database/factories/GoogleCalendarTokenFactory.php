<?php

namespace Database\Factories;

use App\Models\GoogleCalendarToken;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GoogleCalendarToken>
 */
class GoogleCalendarTokenFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->employer(),
            'calendar_email' => fake()->safeEmail(),
            'access_token' => 'access-'.fake()->unique()->lexify('????????????????'),
            'refresh_token' => 'refresh-'.fake()->lexify('????????????????'),
            'expires_at' => now()->addHour(),
            'scopes' => ['https://www.googleapis.com/auth/calendar.events'],
        ];
    }
}
