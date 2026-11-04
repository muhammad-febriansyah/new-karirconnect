<?php

namespace App\Models;

use Database\Factories\ScrapedCompanyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * An employer seen on an external source. Profile fields mirror `companies`;
 * `company_id` links it to a registered company once an admin matches them.
 */
#[Fillable([
    'name',
    'normalized_name',
    'domain',
    'tagline',
    'logo_url',
    'logo_path',
    'cover_url',
    'cover_path',
    'website',
    'email',
    'recruitment_email',
    'recruitment_email_source',
    'recruitment_email_verified_at',
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
    'profile_source_url',
    'profile_fetched_at',
    'logo_fetched_at',
    'company_id',
])]
class ScrapedCompany extends Model
{
    /** @use HasFactory<ScrapedCompanyFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'founded_year' => 'integer',
            'profile_fetched_at' => 'datetime',
            'logo_fetched_at' => 'datetime',
            'recruitment_email_verified_at' => 'datetime',
        ];
    }

    /**
     * Lower-cased, punctuation-free name with legal suffixes (PT, Tbk, Inc,
     * Ltd...) removed, so "PT. Acme Indonesia Tbk" and "Acme Indonesia" match.
     */
    public static function normalizeName(string $name): string
    {
        $normalized = Str::of($name)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9 ]+/', ' ')
            ->replaceMatches('/\b(pt|cv|tbk|persero|inc|ltd|llc|corp|corporation|co|limited|gmbh|pte)\b/', ' ')
            ->squish()
            ->toString();

        return $normalized !== '' ? $normalized : Str::lower(trim($name));
    }

    /**
     * The locally stored logo when we have one, otherwise the source's URL.
     */
    public function logoUrl(): ?string
    {
        if (filled($this->logo_path)) {
            return Storage::disk('public')->url($this->logo_path);
        }

        return $this->logo_url;
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
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
     * @return HasMany<ScrapedJobListing, $this>
     */
    public function listings(): HasMany
    {
        return $this->hasMany(ScrapedJobListing::class);
    }
}
