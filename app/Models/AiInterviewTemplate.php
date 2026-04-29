<?php

namespace App\Models;

use App\Enums\AiInterviewMode;
use Database\Factories\AiInterviewTemplateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'company_id',
    'job_id',
    'name',
    'description',
    'mode',
    'language',
    'duration_minutes',
    'question_count',
    'system_prompt',
    'is_default',
])]
class AiInterviewTemplate extends Model
{
    /** @use HasFactory<AiInterviewTemplateFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'mode' => AiInterviewMode::class,
            'duration_minutes' => 'integer',
            'question_count' => 'integer',
            'is_default' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<Job, $this>
     */
    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }
}
