<?php

use App\Enums\SubscriptionTier;
use App\Models\SubscriptionPlan;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Idempotent upsert of the free Trial plan. Auto-granted on onboarding
     * completion (no payment gateway), time-boxed and quota-limited so it can
     * showcase the real product before an Employer upgrades to Basic/Pro.
     * The numbers are admin-editable afterwards from the pricing-plan screen.
     */
    public function up(): void
    {
        SubscriptionPlan::query()->updateOrCreate(
            ['slug' => 'trial'],
            [
                'name' => 'Trial',
                'tier' => SubscriptionTier::Trial,
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
        );

        // Keep the public pricing order Trial → Basic → Pro regardless of the
        // historical sort_order values already in the table.
        SubscriptionPlan::query()->where('slug', 'basic')->update(['sort_order' => 1]);
        SubscriptionPlan::query()->where('slug', 'pro')->update(['sort_order' => 2]);
    }

    public function down(): void
    {
        SubscriptionPlan::query()->where('slug', 'trial')->delete();
    }
};
