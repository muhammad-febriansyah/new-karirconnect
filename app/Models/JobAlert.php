<?php

namespace App\Models;

use App\Enums\ExperienceLevel;
use Database\Factories\JobAlertFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'name',
    'keyword',
    'job_category_id',
    'city_id',
    'province_id',
    'experience_level',
    'employment_type',
    'work_arrangement',
    'salary_min',
    'frequency',
    'is_active',
    'last_sent_at',
    'total_matches_sent',
])]
class JobAlert extends Model
{
    /** @use HasFactory<JobAlertFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'experience_level' => ExperienceLevel::class,
            'salary_min' => 'integer',
            'is_active' => 'boolean',
            'last_sent_at' => 'datetime',
            'total_matches_sent' => 'integer',
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

    public function isDue(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if (! $this->last_sent_at) {
            return true;
        }

        return match ($this->frequency) {
            'daily' => $this->last_sent_at->lt(now()->subDay()),
            'weekly' => $this->last_sent_at->lt(now()->subWeek()),
            'instant' => true,
            default => false,
        };
    }
}
