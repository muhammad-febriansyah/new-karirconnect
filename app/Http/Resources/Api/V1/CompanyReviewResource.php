<?php

namespace App\Http\Resources\Api\V1;

use App\Models\CompanyReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A published company review.
 *
 * @mixin CompanyReview
 */
class CompanyReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'rating' => $this->rating,
            'rating_management' => $this->rating_management,
            'rating_culture' => $this->rating_culture,
            'rating_compensation' => $this->rating_compensation,
            'rating_growth' => $this->rating_growth,
            'rating_balance' => $this->rating_balance,
            'pros' => $this->pros,
            'cons' => $this->cons,
            'advice_to_management' => $this->advice_to_management,
            'employment_status' => $this->employment_status,
            'employment_type' => $this->employment_type,
            'job_title' => $this->job_title,
            'would_recommend' => (bool) $this->would_recommend,
            'is_anonymous' => (bool) $this->is_anonymous,

            // The author asked not to be named. Neither the name nor the avatar
            // may appear -- an avatar identifies a person just as well.
            'author_name' => $this->is_anonymous ? null : $this->author?->name,
            'author_avatar_url' => $this->is_anonymous || ! $this->author?->avatar_path
                ? null
                : asset('storage/'.$this->author->avatar_path),

            'response_body' => $this->response_body,
            'responded_at' => $this->responded_at?->toIso8601String(),
            'helpful_count' => $this->helpful_count,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
