<?php

namespace Database\Factories;

use App\Models\JobAlert;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobAlert>
 */
class JobAlertFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->employee(),
            'name' => fake()->jobTitle().' Alert',
            'keyword' => fake()->word(),
            'frequency' => 'daily',
            'is_active' => true,
            'total_matches_sent' => 0,
        ];
    }

    public function inactive(): self
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
