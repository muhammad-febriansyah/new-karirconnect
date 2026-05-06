<?php

namespace App\Models;

use Database\Factories\AiInterviewTemplateQuestionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'template_id',
    'order_number',
    'category',
    'question',
    'context',
    'expected_keywords',
    'max_duration_seconds',
])]
class AiInterviewTemplateQuestion extends Model
{
    /** @use HasFactory<AiInterviewTemplateQuestionFactory> */
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
     * @return BelongsTo<AiInterviewTemplate, $this>
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(AiInterviewTemplate::class, 'template_id');
    }
}
