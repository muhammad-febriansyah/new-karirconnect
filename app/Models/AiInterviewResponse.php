<?php

namespace App\Models;

use Database\Factories\AiInterviewResponseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'session_id',
    'question_id',
    'answer_text',
    'audio_url',
    'transcript',
    'duration_seconds',
    'ai_score',
    'sub_scores',
    'ai_feedback',
    'evaluated_at',
])]
class AiInterviewResponse extends Model
{
    /** @use HasFactory<AiInterviewResponseFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sub_scores' => 'array',
            'evaluated_at' => 'datetime',
            'ai_score' => 'integer',
            'duration_seconds' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<AiInterviewSession, $this>
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(AiInterviewSession::class, 'session_id');
    }

    /**
     * @return BelongsTo<AiInterviewQuestion, $this>
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(AiInterviewQuestion::class, 'question_id');
    }
}
