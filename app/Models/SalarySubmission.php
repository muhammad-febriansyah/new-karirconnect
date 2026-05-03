<?php

namespace App\Models;

use App\Enums\ExperienceLevel;
use Database\Factories\SalarySubmissionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'company_id',
    'job_category_id',
    'city_id',
    'province_id',
    'job_title',
    'experience_level',
    'experience_years',
    'employment_type',
    'salary_idr',
    'bonus_idr',
    'is_anonymous',
    'is_verified',
    'status',
    'moderated_by_user_id',
    'moderated_at',
])]
class SalarySubmission extends Model
{
    /** @use HasFactory<SalarySubmissionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'experience_level' => ExperienceLevel::class,
            'experience_years' => 'integer',
            'salary_idr' => 'integer',
            'bonus_idr' => 'integer',
            'is_anonymous' => 'boolean',
            'is_verified' => 'boolean',
            'moderated_at' => 'datetime',
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
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<JobCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(JobCategory::class, 'job_category_id');
    }

    /**
     * @return BelongsTo<City, $this>
     */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }
}
