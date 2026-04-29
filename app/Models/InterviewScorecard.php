<?php

namespace App\Models;

use Database\Factories\InterviewScorecardFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'interview_id',
    'reviewer_id',
    'overall_score',
    'recommendation',
    'criteria_scores',
    'strengths',
    'weaknesses',
    'comments',
    'submitted_at',
])]
class InterviewScorecard extends Model
{
    /** @use HasFactory<InterviewScorecardFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'overall_score' => 'integer',
            'criteria_scores' => 'array',
            'submitted_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Interview, $this>
     */
    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
