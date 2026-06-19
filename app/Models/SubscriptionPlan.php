<?php

namespace App\Models;

use App\Enums\SubscriptionTier;
use Database\Factories\SubscriptionPlanFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'slug',
    'tier',
    'price_idr',
    'billing_period_days',
    'job_post_quota',
    'featured_credits',
    'ai_interview_credits',
    'features',
    'is_active',
    'is_featured',
    'sort_order',
])]
class SubscriptionPlan extends Model
{
    /** @use HasFactory<SubscriptionPlanFactory> */
    use HasFactory;

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * @return HasMany<CompanySubscription, $this>
     */
    public function companySubscriptions(): HasMany
    {
        return $this->hasMany(CompanySubscription::class, 'plan_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tier' => SubscriptionTier::class,
            'features' => 'array',
            'price_idr' => 'integer',
            'billing_period_days' => 'integer',
            'job_post_quota' => 'integer',
            'featured_credits' => 'integer',
            'ai_interview_credits' => 'integer',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
