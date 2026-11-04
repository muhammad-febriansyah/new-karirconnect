<?php

namespace Database\Factories;

use App\Enums\CircuitState;
use App\Enums\JobSourceStatus;
use App\Enums\JobSourceType;
use App\Models\JobSource;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<JobSource>
 */
class JobSourceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $token = Str::slug(fake()->unique()->company()).'-'.fake()->unique()->randomNumber(4);

        return [
            'name' => Str::headline($token),
            'slug' => $token,
            'type' => JobSourceType::Greenhouse,
            'base_url' => "https://boards-api.greenhouse.io/v1/boards/{$token}/jobs",
            'allowed_domains' => ['boards-api.greenhouse.io'],
            'config' => ['board_token' => $token],
            'status' => JobSourceStatus::Active,
            'permission_notes' => 'Public job board API.',
            'robots_checked_at' => now(),
            'schedule_minutes' => 1440,
            'rate_limit_per_minute' => 30,
            'max_pages' => 20,
            'expected_min_items' => 0,
            'browser_allowed' => false,
            'consecutive_failures' => 0,
            'circuit_state' => CircuitState::Closed,
        ];
    }

    public function lever(): static
    {
        return $this->state(function (array $attributes): array {
            $slug = $attributes['slug'];

            return [
                'type' => JobSourceType::Lever,
                'base_url' => "https://api.lever.co/v0/postings/{$slug}",
                'allowed_domains' => ['api.lever.co', 'jobs.lever.co'],
                'config' => ['company' => $slug],
            ];
        });
    }

    public function disabled(): static
    {
        return $this->state(fn (): array => ['status' => JobSourceStatus::Disabled]);
    }

    public function pendingPermission(): static
    {
        return $this->state(fn (): array => [
            'status' => JobSourceStatus::PendingPermission,
            'permission_notes' => null,
            'robots_checked_at' => null,
        ]);
    }

    public function circuitOpen(): static
    {
        return $this->state(fn (): array => [
            'circuit_state' => CircuitState::Open,
            'circuit_open_until' => now()->addHour(),
            'consecutive_failures' => 3,
        ]);
    }
}
