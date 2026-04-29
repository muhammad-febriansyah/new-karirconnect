<?php

namespace Database\Factories;

use App\Models\Certification;
use App\Models\EmployeeProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Certification>
 */
class CertificationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'employee_profile_id' => EmployeeProfile::factory(),
            'name' => 'AWS Certified Developer',
            'issuer' => 'Amazon Web Services',
            'credential_id' => fake()->bothify('AWS-#####'),
            'credential_url' => fake()->url(),
            'issued_date' => '2024-01-01',
            'expires_date' => '2027-01-01',
        ];
    }
}
