<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyReview>
 */
class CompanyReviewFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'user_id' => User::factory()->employee(),
            'title' => fake()->sentence(6),
            'rating' => fake()->numberBetween(3, 5),
            'rating_management' => fake()->numberBetween(2, 5),
            'rating_culture' => fake()->numberBetween(2, 5),
            'rating_compensation' => fake()->numberBetween(2, 5),
            'rating_growth' => fake()->numberBetween(2, 5),
            'rating_balance' => fake()->numberBetween(2, 5),
            'pros' => fake()->paragraph(),
            'cons' => fake()->paragraph(),
            'advice_to_management' => fake()->sentence(),
            'employment_status' => 'current',
            'employment_type' => 'full_time',
            'job_title' => fake()->jobTitle(),
            'would_recommend' => true,
            'is_anonymous' => true,
            'status' => 'pending',
            'helpful_count' => 0,
        ];
    }

    public function approved(): self
    {
        return $this->state(fn () => [
            'status' => 'approved',
            'moderated_at' => now(),
        ]);
    }
}
