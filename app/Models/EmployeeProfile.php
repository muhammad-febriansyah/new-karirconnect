<?php

namespace App\Models;

use App\Enums\ExperienceLevel;
use App\Enums\Gender;
use Database\Factories\EmployeeProfileFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'headline',
    'about',
    'date_of_birth',
    'gender',
    'province_id',
    'city_id',
    'current_position',
    'expected_salary_min',
    'expected_salary_max',
    'experience_level',
    'primary_resume_id',
    'portfolio_url',
    'linkedin_url',
    'github_url',
    'profile_completion',
    'is_open_to_work',
    'visibility',
    'cv_builder_json',
])]
class EmployeeProfile extends Model
{
    /** @use HasFactory<EmployeeProfileFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'gender' => Gender::class,
            'expected_salary_min' => 'integer',
            'expected_salary_max' => 'integer',
            'experience_level' => ExperienceLevel::class,
            'profile_completion' => 'integer',
            'is_open_to_work' => 'boolean',
            'cv_builder_json' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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
     * @return BelongsTo<CandidateCv, $this>
     */
    public function primaryResume(): BelongsTo
    {
        return $this->belongsTo(CandidateCv::class, 'primary_resume_id');
    }

    /**
     * @return HasMany<Education, $this>
     */
    public function educations(): HasMany
    {
        return $this->hasMany(Education::class);
    }

    /**
     * @return HasMany<WorkExperience, $this>
     */
    public function workExperiences(): HasMany
    {
        return $this->hasMany(WorkExperience::class);
    }

    /**
     * @return HasMany<Certification, $this>
     */
    public function certifications(): HasMany
    {
        return $this->hasMany(Certification::class);
    }

    /**
     * @return HasMany<CandidateCv, $this>
     */
    public function cvs(): HasMany
    {
        return $this->hasMany(CandidateCv::class);
    }

    /**
     * @return BelongsToMany<Skill, $this>
     */
    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'employee_skill')
            ->withPivot(['level', 'years_experience', 'is_endorsed_by_assessment'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<Application, $this>
     */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    /**
     * @return HasMany<SkillAssessment, $this>
     */
    public function skillAssessments(): HasMany
    {
        return $this->hasMany(SkillAssessment::class);
    }
}
