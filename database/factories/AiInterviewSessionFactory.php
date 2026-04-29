<?php

namespace Database\Factories;

use App\Models\AiInterviewSession;
use App\Models\EmployeeProfile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AiInterviewSession>
 */
class AiInterviewSessionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'application_id' => null,
            'candidate_profile_id' => EmployeeProfile::factory(),
            'job_id' => null,
            'template_id' => null,
            'mode' => 'text',
            'language' => 'id',
            'status' => 'pending',
            'invitation_token' => Str::random(32),
            'expires_at' => now()->addDays(7),
            'ai_provider' => 'fake',
            'ai_model' => 'fake-model-1',
            'is_practice' => false,
        ];
    }

    public function inProgress(): self
    {
        return $this->state(fn () => [
            'status' => 'in_progress',
            'started_at' => now(),
        ]);
    }

    public function completed(): self
    {
        return $this->state(fn () => [
            'status' => 'completed',
            'started_at' => now()->subMinutes(20),
            'completed_at' => now(),
            'duration_seconds' => 1200,
        ]);
    }
}
