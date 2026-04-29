<?php

namespace App\Models;

use App\Enums\EducationLevel;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
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
}
