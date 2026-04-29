<?php

namespace Database\Factories;

use App\Enums\ReviewStatus;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyVerification>
 */
class CompanyVerificationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'uploaded_by_user_id' => User::factory()->employer(),
            'document_type' => fake()->randomElement(['nib', 'akta', 'npwp', 'siup', 'other']),
            'file_path' => 'company-verifications/sample.pdf',
            'original_name' => 'sample.pdf',
            'status' => ReviewStatus::Pending,
        ];
    }
}
