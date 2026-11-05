<?php

namespace App\Models;

use App\Enums\EducationLevel;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\JobSourceType;
use App\Enums\JobStatus;
use App\Enums\WorkArrangement;
use Database\Factories\JobFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'company_id',
    'scraped_job_listing_id',
    'external_apply_url',
    'posted_by_user_id',
    'job_category_id',
    'title',
    'slug',
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
    'is_salary_visible',
    'province_id',
    'city_id',
    'status',
    'application_deadline',
    'is_anonymous',
    'is_featured',
    'featured_until',
    'views_count',
    'applications_count',
    'ai_match_threshold',
    'auto_invite_ai_interview',
    'published_at',
    'closed_at',
])]
class Job extends Model
{
    /** @use HasFactory<JobFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'job_posts';

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

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
            'status' => JobStatus::class,
            'salary_min' => 'integer',
            'salary_max' => 'integer',
            'is_salary_visible' => 'boolean',
            'is_anonymous' => 'boolean',
            'is_featured' => 'boolean',
            'views_count' => 'integer',
            'applications_count' => 'integer',
            'ai_match_threshold' => 'integer',
            'auto_invite_ai_interview' => 'boolean',
            'application_deadline' => 'date',
            'featured_until' => 'datetime',
            'published_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function isPublished(): bool
    {
        return $this->status === JobStatus::Published;
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function postedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by_user_id');
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
     * @return BelongsToMany<Skill>
     */
    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'job_skill')
            ->withPivot(['proficiency', 'is_required'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<JobScreeningQuestion, $this>
     */
    public function screeningQuestions(): HasMany
    {
        return $this->hasMany(JobScreeningQuestion::class)->orderBy('order_number');
    }

    /**
     * @return HasMany<SavedJob, $this>
     */
    public function savedJobs(): HasMany
    {
        return $this->hasMany(SavedJob::class);
    }

    /**
     * @return HasMany<Application, $this>
     */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    /**
     * @return HasMany<JobView, $this>
     */
    public function views(): HasMany
    {
        return $this->hasMany(JobView::class);
    }

    /**
     * The scraped listing this job was published from (Jobs Eksternal).
     *
     * @return BelongsTo<ScrapedJobListing, $this>
     */
    public function scrapedListing(): BelongsTo
    {
        return $this->belongsTo(ScrapedJobListing::class, 'scraped_job_listing_id');
    }

    public function isExternal(): bool
    {
        return $this->scraped_job_listing_id !== null;
    }

    /**
     * Where applications to this external job are forwarded, if an admin has
     * set a recruitment email for the company. Null means the candidate is
     * sent to the original apply page instead.
     */
    /**
     * Terms of the source this external job came from (set in
     * config/job_catalog.php): attribution, apply on the original page only,
     * and whether its listings may be re-shared as structured data.
     *
     * @return array{attribution: array{name: string, url: string}|null, apply_external_only: bool, no_structured_data: bool}
     */
    public function externalRules(): array
    {
        $source = $this->isExternal() ? $this->scrapedListing?->source : null;
        $rules = $source?->config['rules'] ?? [];

        return [
            // Shown publicly only for job feeds, whose terms require a credit.
            'attribution' => $source?->type === JobSourceType::JobFeed && isset($rules['attribution']['name'], $rules['attribution']['url'])
                ? $rules['attribution']
                : null,
            'apply_external_only' => (bool) ($rules['apply_external_only'] ?? false),
            'no_structured_data' => (bool) ($rules['no_structured_data'] ?? false),
        ];
    }

    public function relayEmail(): ?string
    {
        if (! $this->isExternal() || $this->externalRules()['apply_external_only']) {
            return null;
        }

        return $this->scrapedListing?->company?->applicationEmail();
    }
}
