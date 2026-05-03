<?php

namespace Database\Factories;

use App\Models\CompanyReview;
use App\Models\ReviewHelpfulVote;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReviewHelpfulVote>
 */
class ReviewHelpfulVoteFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'review_id' => CompanyReview::factory(),
            'user_id' => User::factory()->employee(),
        ];
    }
}
