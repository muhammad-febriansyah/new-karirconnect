<?php

namespace Database\Factories;

use App\Enums\InterviewMode;
use App\Enums\InterviewStage;
use App\Enums\InterviewStatus;
use App\Models\Application;
use App\Models\Interview;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Interview>
 */
class InterviewFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = now()->addDays(fake()->numberBetween(1, 14))->setTime(fake()->numberBetween(9, 16), 0);
        $duration = 60;

        return [
            'application_id' => Application::factory(),
            'stage' => InterviewStage::HR,
            'mode' => InterviewMode::Online,
            'title' => 'Interview '.fake()->word(),
            'scheduled_at' => $start,
            'duration_minutes' => $duration,
            'ends_at' => $start->copy()->addMinutes($duration),
            'timezone' => 'Asia/Jakarta',
            'status' => InterviewStatus::Scheduled,
            'meeting_provider' => 'google_meet',
            'meeting_url' => 'https://meet.google.com/'.fake()->lexify('???-????-???'),
            'requires_confirmation' => true,
            'scheduled_by_user_id' => User::factory()->employer(),
        ];
    }

    public function onsite(): self
    {
        return $this->state(fn () => [
            'mode' => InterviewMode::Onsite,
            'meeting_provider' => null,
            'meeting_url' => null,
            'location_name' => fake()->company(),
            'location_address' => fake()->address(),
        ]);
    }

    public function ai(): self
    {
        return $this->state(fn () => [
            'mode' => InterviewMode::Ai,
            'meeting_provider' => null,
            'meeting_url' => null,
        ]);
    }

    public function completed(): self
    {
        return $this->state(fn () => ['status' => InterviewStatus::Completed]);
    }
}
