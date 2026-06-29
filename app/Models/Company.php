<?php

namespace App\Models;

use App\Enums\CompanyStatus;
use App\Enums\CompanyVerificationStatus;
use App\Enums\SubscriptionStatus;
use Database\Factories\CompanyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'owner_id',
    'name',
    'slug',
    'tagline',
    'logo_path',
    'cover_path',
    'website',
    'email',
    'phone',
    'industry_id',
    'company_size_id',
    'founded_year',
    'province_id',
    'city_id',
    'address',
    'about',
    'culture',
    'benefits',
    'status',
    'verification_status',
    'approved_at',
    'verified_at',
    'onboarding_completed_at',
    'trial_redeemed_at',
])]
class Company extends Model
{
    /** @use HasFactory<CompanyFactory> */
    use HasFactory, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'founded_year' => 'integer',
            'status' => CompanyStatus::class,
            'verification_status' => CompanyVerificationStatus::class,
            'approved_at' => 'datetime',
            'verified_at' => 'datetime',
            'onboarding_completed_at' => 'datetime',
            'trial_redeemed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * @return BelongsTo<Industry, $this>
     */
    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class);
    }

    /**
     * @return BelongsTo<CompanySize, $this>
     */
    public function companySize(): BelongsTo
    {
        return $this->belongsTo(CompanySize::class);
    }

    /**
     * Backward-compatible alias used by existing controllers/pages.
     *
     * @return BelongsTo<CompanySize, $this>
     */
    public function size(): BelongsTo
    {
        return $this->belongsTo(CompanySize::class, 'company_size_id');
    }

    /**
     * @return BelongsTo<Province, $this>
     */
    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    /**
     * @return BelongsTo<City, $this>
     */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    /**
     * @return HasMany<CompanyMember, $this>
     */
    public function members(): HasMany
    {
        return $this->hasMany(CompanyMember::class);
    }

    /**
     * @return HasMany<CompanyOffice, $this>
     */
    public function offices(): HasMany
    {
        return $this->hasMany(CompanyOffice::class)
            ->orderByDesc('is_headquarter')
            ->orderBy('label');
    }

    /**
     * @return HasMany<CompanyBadge, $this>
     */
    public function badges(): HasMany
    {
        return $this->hasMany(CompanyBadge::class)
            ->orderByDesc('is_active')
            ->orderBy('name');
    }

    /**
     * @return HasMany<CompanyVerification, $this>
     */
    public function verifications(): HasMany
    {
        return $this->hasMany(CompanyVerification::class);
    }

    /**
     * @return HasMany<Job, $this>
     */
    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class)
            ->latest('published_at')
            ->latest('id');
    }

    /**
     * @return HasMany<CompanySubscription, $this>
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(CompanySubscription::class);
    }

    /**
     * The currently active subscription (paid or trial), if any. Returns null
     * when none is active or the active one has already lapsed past its end.
     */
    public function activeSubscription(): ?CompanySubscription
    {
        return $this->subscriptions()
            ->with('plan')
            ->where('status', SubscriptionStatus::Active)
            ->where(function ($query): void {
                $query->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })
            ->latest('starts_at')
            ->first();
    }

    /**
     * Whether the company has ever redeemed the one-time free trial.
     */
    public function hasUsedTrial(): bool
    {
        return $this->trial_redeemed_at !== null;
    }

    /**
     * Whether the company may use recruiter features and appear publicly.
     *
     * A verified company is treated as approved because admin verification
     * already reviews and approves the company. A suspended company is always
     * blocked regardless of its verification badge.
     */
    public function hasRecruiterAccess(): bool
    {
        if ($this->status === CompanyStatus::Suspended) {
            return false;
        }

        return $this->status === CompanyStatus::Approved
            || $this->verification_status === CompanyVerificationStatus::Verified;
    }

    /**
     * Limit the query to companies that are live on the platform: approved or
     * verified, but never suspended.
     *
     * @param  Builder<Company>  $query
     */
    public function scopeRecruiterActive(Builder $query): void
    {
        $query
            ->where('status', '!=', CompanyStatus::Suspended)
            ->where(function (Builder $inner): void {
                $inner
                    ->where('status', CompanyStatus::Approved)
                    ->orWhere('verification_status', CompanyVerificationStatus::Verified);
            });
    }
}
