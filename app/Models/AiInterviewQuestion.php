<?php

namespace App\Models;

use Database\Factories\AiInterviewQuestionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'session_id',
    'order_number',
    'category',
    'question',
    'context',
    'expected_keywords',
    'max_duration_seconds',
])]
class AiInterviewQuestion extends Model
{
    /** @use HasFactory<AiInterviewQuestionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expected_keywords' => 'array',
            'order_number' => 'integer',
            'max_duration_seconds' => 'integer',
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
     * @return HasOne<AiInterviewResponse, $this>
     */
    public function response(): HasOne
    {
        return $this->hasOne(AiInterviewResponse::class, 'question_id');
    }
}
