<?php

namespace App\Models;

use Database\Factories\CandidateOutreachMessageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'company_id',
    'sender_user_id',
    'candidate_profile_id',
    'candidate_user_id',
    'job_id',
    'subject',
    'body',
    'status',
    'sent_at',
    'replied_at',
    'reply_body',
])]
class CandidateOutreachMessage extends Model
{
    /** @use HasFactory<CandidateOutreachMessageFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'replied_at' => 'datetime',
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
     * @return BelongsTo<User, $this>
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }

    /**
     * @return BelongsTo<EmployeeProfile, $this>
     */
    public function candidateProfile(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class, 'candidate_profile_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function candidateUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'candidate_user_id');
    }

    /**
     * @return BelongsTo<Job, $this>
     */
    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }
}
