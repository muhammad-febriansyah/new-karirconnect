<?php

namespace App\Models;

use App\Enums\ReviewStatus;
use Database\Factories\CompanyReviewFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'company_id',
    'user_id',
    'title',
    'rating',
    'rating_management',
    'rating_culture',
    'rating_compensation',
    'rating_growth',
    'rating_balance',
    'pros',
    'cons',
    'advice_to_management',
    'employment_status',
    'employment_type',
    'job_title',
    'would_recommend',
    'is_anonymous',
    'status',
    'moderated_by_user_id',
    'moderated_at',
    'moderation_note',
    'responded_by_user_id',
    'response_body',
    'responded_at',
    'helpful_count',
])]
class CompanyReview extends Model
{
    /** @use HasFactory<CompanyReviewFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ReviewStatus::class,
            'rating' => 'integer',
            'rating_management' => 'integer',
            'rating_culture' => 'integer',
            'rating_compensation' => 'integer',
            'rating_growth' => 'integer',
            'rating_balance' => 'integer',
            'would_recommend' => 'boolean',
            'is_anonymous' => 'boolean',
            'helpful_count' => 'integer',
            'moderated_at' => 'datetime',
            'responded_at' => 'datetime',
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
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function responder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by_user_id');
    }

    /**
     * @return HasMany<ReviewHelpfulVote, $this>
     */
    public function helpfulVotes(): HasMany
    {
        return $this->hasMany(ReviewHelpfulVote::class, 'review_id');
    }
}
