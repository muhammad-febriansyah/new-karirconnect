<?php

namespace Database\Factories;

use App\Models\Interview;
use App\Models\InterviewRescheduleRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InterviewRescheduleRequest>
 */
class InterviewRescheduleRequestFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'interview_id' => Interview::factory(),
            'requested_by_user_id' => User::factory()->employee(),
            'reason' => fake()->sentence(),
            'proposed_slots' => [
                now()->addDays(2)->setTime(10, 0)->toIso8601String(),
                now()->addDays(3)->setTime(14, 0)->toIso8601String(),
            ],
            'status' => 'pending',
        ];
    }
}
