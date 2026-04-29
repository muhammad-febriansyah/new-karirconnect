<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\CompanyBadge;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyBadge>
 */
class CompanyBadgeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'code' => fake()->unique()->slug(),
            'name' => fake()->randomElement(['Fast Response', 'Verified Employer', 'Top Responder']),
            'description' => fake()->sentence(),
            'tone' => fake()->randomElement(['secondary', 'success', 'warning', 'info']),
            'awarded_at' => now()->subDays(fake()->numberBetween(1, 60)),
            'expires_at' => null,
            'is_active' => true,
        ];
    }
}
