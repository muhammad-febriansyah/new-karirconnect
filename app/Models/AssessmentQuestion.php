<?php

namespace App\Models;

use Database\Factories\AssessmentQuestionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'skill_id',
    'type',
    'question',
    'options',
    'correct_answer',
    'difficulty',
    'time_limit_seconds',
    'is_active',
])]
class AssessmentQuestion extends Model
{
    /** @use HasFactory<AssessmentQuestionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'options' => 'array',
            'correct_answer' => 'array',
            'time_limit_seconds' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Skill, $this>
     */
    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }
}
