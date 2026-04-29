<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\SubscriptionPlan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanySubscription>
 */
class CompanySubscriptionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'plan_id' => SubscriptionPlan::factory(),
            'status' => 'active',
            'starts_at' => now(),
            'ends_at' => now()->addDays(30),
            'jobs_posted_count' => 0,
            'featured_credits_remaining' => 1,
            'ai_credits_remaining' => 10,
            'auto_renew' => false,
        ];
    }

    public function expired(): self
    {
        return $this->state(fn () => [
            'status' => 'expired',
            'ends_at' => now()->subDay(),
        ]);
    }
}
