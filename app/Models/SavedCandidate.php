<?php

namespace App\Models;

use Database\Factories\SavedCandidateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'company_id',
    'candidate_profile_id',
    'saved_by_user_id',
    'label',
    'note',
    'saved_at',
])]
class SavedCandidate extends Model
{
    /** @use HasFactory<SavedCandidateFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'saved_at' => 'datetime',
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
     * @return BelongsTo<EmployeeProfile, $this>
     */
    public function candidateProfile(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class, 'candidate_profile_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function savedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'saved_by_user_id');
    }
}
