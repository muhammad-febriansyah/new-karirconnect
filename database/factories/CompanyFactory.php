<?php

namespace Database\Factories;

use App\Enums\CompanyStatus;
use App\Enums\CompanyVerificationStatus;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->company();

        return [
            'owner_id' => User::factory()->employer(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(6),
            'tagline' => fake()->catchPhrase(),
            'website' => fake()->url(),
            'email' => fake()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'industry_id' => null,
            'company_size_id' => null,
            'founded_year' => fake()->numberBetween(1990, 2024),
            'province_id' => null,
            'city_id' => null,
            'address' => fake()->address(),
            'about' => fake()->paragraph(),
            'culture' => fake()->paragraph(),
            'benefits' => fake()->paragraph(),
            'status' => CompanyStatus::Pending,
            'verification_status' => CompanyVerificationStatus::Unverified,
            'onboarding_completed_at' => now(),
        ];
    }

    /**
     * Indicate that the company owner has not completed the wizard yet.
     */
    public function pendingOnboarding(): self
    {
        return $this->state(fn () => [
            'onboarding_completed_at' => null,
        ]);
    }

    public function approved(): self
    {
        return $this->state(fn () => [
            'status' => CompanyStatus::Approved,
            'approved_at' => now(),
        ]);
    }

    public function verified(): self
    {
        return $this->state(fn () => [
            'status' => CompanyStatus::Approved,
            'verification_status' => CompanyVerificationStatus::Verified,
            'approved_at' => now(),
            'verified_at' => now(),
        ]);
    }
}
