<?php

namespace App\Models;

use Database\Factories\AiMatchScoreFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'job_id',
    'candidate_profile_id',
    'score',
    'breakdown',
    'explanation',
    'computed_at',
])]
class AiMatchScore extends Model
{
    /** @use HasFactory<AiMatchScoreFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'breakdown' => 'array',
            'score' => 'integer',
            'computed_at' => 'datetime',
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
    public function candidateProfile(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class, 'candidate_profile_id');
    }
}
