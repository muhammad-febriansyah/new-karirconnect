<?php

namespace App\Models;

use Database\Factories\ReviewHelpfulVoteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'review_id',
    'user_id',
])]
class ReviewHelpfulVote extends Model
{
    /** @use HasFactory<ReviewHelpfulVoteFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<CompanyReview, $this>
     */
    public function review(): BelongsTo
    {
        return $this->belongsTo(CompanyReview::class, 'review_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
