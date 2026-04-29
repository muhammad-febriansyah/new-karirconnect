<?php

namespace Database\Factories;

use App\Models\CandidateOutreachMessage;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CandidateOutreachMessage>
 */
class CandidateOutreachMessageFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'sender_user_id' => User::factory()->employer(),
            'candidate_profile_id' => EmployeeProfile::factory(),
            'candidate_user_id' => User::factory()->employee(),
            'job_id' => null,
            'subject' => fake()->sentence(),
            'body' => fake()->paragraphs(2, true),
            'status' => 'sent',
            'sent_at' => now(),
        ];
    }
}
