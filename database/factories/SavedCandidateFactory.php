<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\SavedCandidate;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SavedCandidate>
 */
class SavedCandidateFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'candidate_profile_id' => EmployeeProfile::factory(),
            'saved_by_user_id' => User::factory()->employer(),
            'label' => null,
            'note' => null,
            'saved_at' => now(),
        ];
    }
}
