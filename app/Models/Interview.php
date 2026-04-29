<?php

namespace App\Models;

use App\Enums\InterviewMode;
use App\Enums\InterviewStage;
use App\Enums\InterviewStatus;
use Database\Factories\InterviewFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'application_id',
    'stage',
    'mode',
    'title',
    'scheduled_at',
    'duration_minutes',
    'ends_at',
    'timezone',
    'status',
    'meeting_provider',
    'meeting_url',
    'meeting_id',
    'meeting_passcode',
    'location_name',
    'location_address',
    'location_map_url',
    'ai_session_id',
    'candidate_instructions',
    'internal_notes',
    'requires_confirmation',
    'confirmed_at',
    'reminder_sent_at',
    'recording_url',
    'recording_consent',
    'scheduled_by_user_id',
])]
class Interview extends Model
{
    /** @use HasFactory<InterviewFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'stage' => InterviewStage::class,
            'mode' => InterviewMode::class,
            'status' => InterviewStatus::class,
            'duration_minutes' => 'integer',
            'scheduled_at' => 'datetime',
            'ends_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
            'requires_confirmation' => 'boolean',
            'recording_consent' => 'boolean',
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
     * @return BelongsTo<User, $this>
     */
    public function scheduledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scheduled_by_user_id');
    }

    /**
     * @return HasMany<InterviewParticipant, $this>
     */
    public function participants(): HasMany
    {
        return $this->hasMany(InterviewParticipant::class);
    }

    /**
     * @return HasMany<InterviewRescheduleRequest, $this>
     */
    public function rescheduleRequests(): HasMany
    {
        return $this->hasMany(InterviewRescheduleRequest::class)->latest('id');
    }

    /**
     * @return HasMany<InterviewScorecard, $this>
     */
    public function scorecards(): HasMany
    {
        return $this->hasMany(InterviewScorecard::class);
    }
}
