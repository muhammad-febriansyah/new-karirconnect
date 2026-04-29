<?php

namespace App\Models;

use App\Enums\ScreeningQuestionType;
use Database\Factories\JobScreeningQuestionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'job_id',
    'question',
    'type',
    'options',
    'is_required',
    'knockout_value',
    'order_number',
])]
class JobScreeningQuestion extends Model
{
    /** @use HasFactory<JobScreeningQuestionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => ScreeningQuestionType::class,
            'options' => 'array',
            'is_required' => 'boolean',
            'knockout_value' => 'array',
            'order_number' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Job, $this>
     */
    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }
}
