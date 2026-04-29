<?php

namespace App\Models;

use Database\Factories\AiInterviewAnalysisFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'session_id',
    'overall_score',
    'fit_score',
    'recommendation',
    'summary',
    'strengths',
    'weaknesses',
    'skill_assessment',
    'communication_score',
    'technical_score',
    'problem_solving_score',
    'culture_fit_score',
    'red_flags',
    'generated_at',
])]
class AiInterviewAnalysis extends Model
{
    /** @use HasFactory<AiInterviewAnalysisFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'strengths' => 'array',
            'weaknesses' => 'array',
            'skill_assessment' => 'array',
            'red_flags' => 'array',
            'generated_at' => 'datetime',
            'overall_score' => 'integer',
            'fit_score' => 'integer',
            'communication_score' => 'integer',
            'technical_score' => 'integer',
            'problem_solving_score' => 'integer',
            'culture_fit_score' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<AiInterviewSession, $this>
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(AiInterviewSession::class, 'session_id');
    }
}
