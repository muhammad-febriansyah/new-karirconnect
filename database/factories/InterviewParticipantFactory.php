<?php

namespace Database\Factories;

use App\Models\Interview;
use App\Models\InterviewParticipant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InterviewParticipant>
 */
class InterviewParticipantFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'interview_id' => Interview::factory(),
            'user_id' => User::factory(),
            'role' => 'interviewer',
            'invitation_response' => 'pending',
        ];
    }
}
