<?php

namespace App\Models;

use Database\Factories\SkillAssessmentAnswerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'assessment_id',
    'question_id',
    'answer',
    'is_correct',
    'time_spent_seconds',
    'created_at',
])]
class SkillAssessmentAnswer extends Model
{
    public $timestamps = false;

    /** @use HasFactory<SkillAssessmentAnswerFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'answer' => 'array',
            'is_correct' => 'boolean',
            'time_spent_seconds' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<SkillAssessment, $this>
     */
    public function assessment(): BelongsTo
    {
        return $this->belongsTo(SkillAssessment::class, 'assessment_id');
    }

    /**
     * @return BelongsTo<AssessmentQuestion, $this>
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(AssessmentQuestion::class);
    }
}
