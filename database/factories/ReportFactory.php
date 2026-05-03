<?php

namespace Database\Factories;

use App\Models\CompanyReview;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Report>
 */
class ReportFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reporter_user_id' => User::factory()->employee(),
            'reportable_type' => CompanyReview::class,
            'reportable_id' => CompanyReview::factory(),
            'reason' => fake()->randomElement(['spam', 'abuse', 'misleading']),
            'description' => fake()->sentence(),
            'status' => 'pending',
            'reviewed_by' => null,
            'reviewed_at' => null,
        ];
    }
}
