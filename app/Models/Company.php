<?php

namespace App\Models;

use App\Enums\CompanyStatus;
use App\Enums\CompanyVerificationStatus;
use Database\Factories\CompanyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
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
}
