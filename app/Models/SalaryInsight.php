<?php

namespace App\Models;

use App\Enums\ExperienceLevel;
use Database\Factories\SalaryInsightFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'job_title',
    'role_category',
    'city_id',
    'experience_level',
    'min_salary',
    'median_salary',
    'max_salary',
    'sample_size',
    'source',
    'last_updated_at',
])]
class SalaryInsight extends Model
{
    /** @use HasFactory<SalaryInsightFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'experience_level' => ExperienceLevel::class,
            'min_salary' => 'integer',
            'median_salary' => 'integer',
            'max_salary' => 'integer',
            'sample_size' => 'integer',
            'last_updated_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<City, $this>
     */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }
}
