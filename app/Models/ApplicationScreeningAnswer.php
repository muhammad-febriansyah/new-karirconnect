<?php

namespace App\Models;

use Database\Factories\ApplicationScreeningAnswerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'application_id',
    'job_screening_question_id',
    'answer',
    'score',
    'is_knockout',
])]
class ApplicationScreeningAnswer extends Model
{
    /** @use HasFactory<ApplicationScreeningAnswerFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'answer' => 'array',
            'score' => 'integer',
            'is_knockout' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Application, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * @return BelongsTo<JobScreeningQuestion, $this>
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(JobScreeningQuestion::class, 'job_screening_question_id');
    }
}
