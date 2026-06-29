<?php

namespace Database\Seeders;

use App\Models\CompanySubscription;
use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Trial',
                'slug' => 'trial',
                'tier' => 'trial',
                'price_idr' => 0,
                'billing_period_days' => 14,
                'job_post_quota' => 2,
                'featured_credits' => 0,
                'ai_interview_credits' => 5,
                'features' => [
                    'Akses 14 hari gratis',
                    'Posting hingga 2 lowongan',
                    'Kirim pesan ke kandidat',
                    '5 kredit AI interview',
                ],
                'is_active' => true,
                'is_featured' => false,
                'sort_order' => 0,
            ],
            [
                'name' => 'Basic',
                'slug' => 'basic',
                'tier' => 'starter',
                'price_idr' => 249000,
                'billing_period_days' => 30,
                'job_post_quota' => 5,
                'featured_credits' => 1,
                'ai_interview_credits' => 15,
                'features' => [
                    '5 lowongan aktif',
                    '1 boost lowongan',
                    '15 sesi AI Interview',
                    'Akses penuh database pelamar',
                    'Email support',
                ],
                'is_active' => true,
                'is_featured' => false,
                'sort_order' => 1,
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'tier' => 'pro',
                'price_idr' => 449000,
                'billing_period_days' => 30,
                'job_post_quota' => 20,
                'featured_credits' => 5,
                'ai_interview_credits' => 60,
                'features' => [
                    '20 lowongan aktif',
                    '5 boost lowongan',
                    '60 sesi AI Interview',
                    'Akses penuh database pelamar',
                    'Talent Search (cari & filter kandidat)',
                    'Outreach kandidat langsung',
                    'Priority support',
                ],
                'is_active' => true,
                'is_featured' => true,
                'sort_order' => 2,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::query()->updateOrCreate(['slug' => $plan['slug']], $plan);
        }

        $keepSlugs = array_column($plans, 'slug');

        SubscriptionPlan::query()->whereNotIn('slug', $keepSlugs)->get()->each(function (SubscriptionPlan $plan): void {
            $hasSubscriptions = CompanySubscription::query()->where('plan_id', $plan->id)->exists();

            if ($hasSubscriptions) {
                $plan->update(['is_active' => false]);
            } else {
                $plan->delete();
            }
        });
    }
}
