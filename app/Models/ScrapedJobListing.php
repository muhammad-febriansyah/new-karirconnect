<?php

namespace App\Models;

use App\Enums\EducationLevel;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\ScrapedJobListingStatus;
use App\Enums\WorkArrangement;
use Database\Factories\ScrapedJobListingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * A job listing collected from an external source. Content fields mirror
 * `job_posts` (App\Models\Job) so it can be published to the portal later.
 * It is kept apart from `job_posts` on purpose: no owner user, no approved
 * company, and no match-score recompute for unmoderated data.
 */
#[Fillable([
    'job_source_id',
    'scraped_company_id',
    'external_id',
    'job_category_id',
    'title',
    'description',
    'responsibilities',
    'requirements',
    'benefits',
    'employment_type',
    'work_arrangement',
    'experience_level',
    'min_education',
    'salary_min',
    'salary_max',
    'salary_currency',
    'is_salary_visible',
    'province_id',
    'city_id',
    'application_deadline',
    'published_at',
    'location_text',
    'apply_url',
    'contact_email',
    'raw_attributes',
    'content_hash',
    'status',
    'first_seen_at',
    'last_seen_at',
    'edited_at',
    'edited_by_user_id',
])]
class ScrapedJobListing extends Model
{
    /** @use HasFactory<ScrapedJobListingFactory> */
    use HasFactory;

    /**
     * Fields that make up the content hash used for cross-source dedup.
     *
     * @var list<string>
     */
    public const HASHED_FIELDS = [
        'title',
        'company',
        'location_text',
        'employment_type',
        'description',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'employment_type' => EmploymentType::class,
            'work_arrangement' => WorkArrangement::class,
            'experience_level' => ExperienceLevel::class,
            'min_education' => EducationLevel::class,
            'status' => ScrapedJobListingStatus::class,
            'salary_min' => 'integer',
            'salary_max' => 'integer',
            'is_salary_visible' => 'boolean',
            'raw_attributes' => 'array',
            'application_deadline' => 'date',
            'published_at' => 'datetime',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'edited_at' => 'datetime',
        ];
    }

    /**
     * Stable sha256 of the normalised content, so the same vacancy posted on
     * two sources collapses into one listing with two origins.
     *
     * @param  array<string, mixed>  $attributes
     */
    public static function computeContentHash(array $attributes): string
    {
        $parts = array_map(function (string $field) use ($attributes): string {
            $value = $attributes[$field] ?? '';

            if ($value instanceof \BackedEnum) {
                $value = $value->value;
            }

            $text = strip_tags((string) $value);
            $text = mb_strtolower(preg_replace('/\s+/u', ' ', $text) ?? '');

            return trim($text);
        }, self::HASHED_FIELDS);

        return hash('sha256', implode('|', $parts));
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function editedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'edited_by_user_id');
    }

    /**
     * @return BelongsTo<JobSource, $this>
     */
    public function source(): BelongsTo
    {
        return $this->belongsTo(JobSource::class, 'job_source_id')->withTrashed();
    }

    /**
     * @return BelongsTo<ScrapedCompany, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(ScrapedCompany::class, 'scraped_company_id');
    }

    /**
     * @return BelongsTo<JobCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(JobCategory::class, 'job_category_id');
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
     * @return BelongsToMany<Skill, $this>
     */
    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'scraped_job_listing_skill')
            ->withPivot(['proficiency', 'is_required'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<ScrapedJobOrigin, $this>
     */
    public function origins(): HasMany
    {
        return $this->hasMany(ScrapedJobOrigin::class);
    }

    /**
     * The portal job created when this listing was published.
     *
     * @return HasOne<Job, $this>
     */
    public function publishedJob(): HasOne
    {
        return $this->hasOne(Job::class, 'scraped_job_listing_id');
    }
}
