<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyMember>
 */
class CompanyMemberFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'user_id' => User::factory()->employer(),
            'role' => 'recruiter',
            'invitation_email' => fake()->safeEmail(),
            'invited_at' => now(),
            'joined_at' => now(),
        ];
    }

    public function owner(): self
    {
        return $this->state(fn () => ['role' => 'owner']);
    }
}
