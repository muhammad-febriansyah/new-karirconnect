<?php

namespace App\Models;

use App\Enums\SubscriptionStatus;
use Database\Factories\CompanySubscriptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'company_id',
    'plan_id',
    'status',
    'starts_at',
    'ends_at',
    'cancelled_at',
    'jobs_posted_count',
    'featured_credits_remaining',
    'ai_credits_remaining',
    'auto_renew',
])]
class CompanySubscription extends Model
{
    /** @use HasFactory<CompanySubscriptionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'jobs_posted_count' => 'integer',
            'featured_credits_remaining' => 'integer',
            'ai_credits_remaining' => 'integer',
            'auto_renew' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<SubscriptionPlan, $this>
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    public function isActive(): bool
    {
        return $this->status === SubscriptionStatus::Active
            && (! $this->ends_at || $this->ends_at->isFuture());
    }
}
