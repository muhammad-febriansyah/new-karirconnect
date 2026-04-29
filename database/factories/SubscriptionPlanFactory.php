<?php

namespace Database\Factories;

use App\Enums\SubscriptionTier;
use App\Models\SubscriptionPlan;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<SubscriptionPlan>
 */
class SubscriptionPlanFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'name' => Str::title($name),
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(100, 9999),
            'tier' => SubscriptionTier::Starter,
            'price_idr' => 499000,
            'billing_period_days' => 30,
            'job_post_quota' => 5,
            'featured_credits' => 1,
            'ai_interview_credits' => 10,
            'features' => ['Email support', 'Basic analytics'],
            'is_active' => true,
            'is_featured' => false,
            'sort_order' => 1,
        ];
    }

    public function pro(): self
    {
        return $this->state(fn () => [
            'tier' => SubscriptionTier::Pro,
            'price_idr' => 1499000,
            'job_post_quota' => 20,
            'featured_credits' => 5,
            'ai_interview_credits' => 100,
            'is_featured' => true,
            'sort_order' => 2,
        ]);
    }
}
