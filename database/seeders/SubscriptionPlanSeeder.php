<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Free',
                'slug' => 'free',
                'tier' => 'free',
                'price_idr' => 0,
                'billing_period_days' => 30,
                'job_post_quota' => 1,
                'featured_credits' => 0,
                'ai_interview_credits' => 0,
                'features' => ['1 lowongan aktif', 'Akses dasar ke pelamar'],
                'is_active' => true,
                'is_featured' => false,
                'sort_order' => 0,
            ],
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'tier' => 'starter',
                'price_idr' => 499000,
                'billing_period_days' => 30,
                'job_post_quota' => 5,
                'featured_credits' => 1,
                'ai_interview_credits' => 10,
                'features' => ['5 lowongan aktif', '1 boost lowongan', '10 sesi AI Interview', 'Email support'],
                'is_active' => true,
                'is_featured' => false,
                'sort_order' => 1,
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'tier' => 'pro',
                'price_idr' => 1499000,
                'billing_period_days' => 30,
                'job_post_quota' => 20,
                'featured_credits' => 5,
                'ai_interview_credits' => 100,
                'features' => ['20 lowongan aktif', '5 boost lowongan', '100 sesi AI Interview', 'Talent Search', 'Priority support'],
                'is_active' => true,
                'is_featured' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'tier' => 'enterprise',
                'price_idr' => 4999000,
                'billing_period_days' => 30,
                'job_post_quota' => 100,
                'featured_credits' => 20,
                'ai_interview_credits' => 500,
                'features' => ['100 lowongan aktif', '20 boost lowongan', '500 sesi AI Interview', 'Dedicated CSM', 'API access'],
                'is_active' => true,
                'is_featured' => false,
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::query()->updateOrCreate(['slug' => $plan['slug']], $plan);
        }
    }
}
