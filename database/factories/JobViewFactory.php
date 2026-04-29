<?php

namespace Database\Factories;

use App\Models\Job;
use App\Models\JobView;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobView>
 */
class JobViewFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'job_id' => Job::factory(),
            'user_id' => User::factory()->employee(),
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
            'source' => 'direct',
        ];
    }
}
