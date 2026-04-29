<?php

namespace App\Models;

use App\Enums\AiInterviewMode;
use App\Enums\AiInterviewStatus;
use Database\Factories\AiInterviewSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'application_id',
    'candidate_profile_id',
    'job_id',
    'template_id',
    'mode',
    'language',
    'status',
    'invitation_token',
    'invited_at',
    'started_at',
    'completed_at',
    'expires_at',
    'duration_seconds',
    'recording_url',
    'live_transcript',
    'ai_provider',
    'ai_model',
    'system_prompt_snapshot',
    'reschedule_count',
    'is_practice',
])]
class AiInterviewSession extends Model
{
    /** @use HasFactory<AiInterviewSessionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'mode' => AiInterviewMode::class,
            'status' => AiInterviewStatus::class,
            'invited_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'expires_at' => 'datetime',
            'duration_seconds' => 'integer',
            'reschedule_count' => 'integer',
            'is_practice' => 'boolean',
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
     * @return BelongsTo<EmployeeProfile, $this>
     */
    public function candidateProfile(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class, 'candidate_profile_id');
    }

    /**
     * @return BelongsTo<Job, $this>
     */
    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }

    /**
     * @return BelongsTo<AiInterviewTemplate, $this>
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(AiInterviewTemplate::class);
    }

    /**
     * @return HasMany<AiInterviewQuestion, $this>
     */
    public function questions(): HasMany
    {
        return $this->hasMany(AiInterviewQuestion::class, 'session_id')->orderBy('order_number');
    }

    /**
     * @return HasMany<AiInterviewResponse, $this>
     */
    public function responses(): HasMany
    {
        return $this->hasMany(AiInterviewResponse::class, 'session_id');
    }

    /**
     * @return HasOne<AiInterviewAnalysis, $this>
     */
    public function analysis(): HasOne
    {
        return $this->hasOne(AiInterviewAnalysis::class, 'session_id');
    }
}
