<?php

namespace App\Models;

use Database\Factories\SkillAssessmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'employee_profile_id',
    'skill_id',
    'status',
    'score',
    'total_questions',
    'correct_answers',
    'started_at',
    'completed_at',
    'expires_at',
])]
class SkillAssessment extends Model
{
    /** @use HasFactory<SkillAssessmentFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'total_questions' => 'integer',
            'correct_answers' => 'integer',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<EmployeeProfile, $this>
     */
    public function employeeProfile(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class);
    }

    /**
     * @return BelongsTo<Skill, $this>
     */
    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }

    /**
     * @return HasMany<SkillAssessmentAnswer, $this>
     */
    public function answers(): HasMany
    {
        return $this->hasMany(SkillAssessmentAnswer::class, 'assessment_id');
    }
}
