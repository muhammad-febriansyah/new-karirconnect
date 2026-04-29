<?php

namespace App\Models;

use App\Enums\ApplicationStatus;
use App\Enums\InterviewStage;
use Database\Factories\ApplicationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'job_id',
    'employee_profile_id',
    'candidate_cv_id',
    'cover_letter',
    'expected_salary',
    'status',
    'ai_match_score',
    'screening_score',
    'current_stage',
    'applied_at',
    'reviewed_at',
])]
class Application extends Model
{
    /** @use HasFactory<ApplicationFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ApplicationStatus::class,
            'current_stage' => InterviewStage::class,
            'expected_salary' => 'integer',
            'ai_match_score' => 'integer',
            'screening_score' => 'integer',
            'applied_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Job, $this>
     */
    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }

    /**
     * @return BelongsTo<EmployeeProfile, $this>
     */
    public function employeeProfile(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class);
    }

    /**
     * @return BelongsTo<CandidateCv, $this>
     */
    public function candidateCv(): BelongsTo
    {
        return $this->belongsTo(CandidateCv::class);
    }

    /**
     * @return HasMany<ApplicationStatusLog, $this>
     */
    public function statusLogs(): HasMany
    {
        return $this->hasMany(ApplicationStatusLog::class)->latest('id');
    }

    /**
     * @return HasMany<ApplicationScreeningAnswer, $this>
     */
    public function screeningAnswers(): HasMany
    {
        return $this->hasMany(ApplicationScreeningAnswer::class);
    }

    /**
     * @return HasMany<Interview, $this>
     */
    public function interviews(): HasMany
    {
        return $this->hasMany(Interview::class);
    }
}
