<?php

namespace App\Services\Reviews;

use App\Enums\ReviewStatus;
use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\EmployeeProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Centralizes review lifecycle: anti-abuse checks at submit time, status
 * transitions for moderators, and counter denormalization for helpful votes.
 *
 * Auto-approves reviews from users with at least one application to the
 * target company (verified former/current candidates). Other reviews land
 * in the moderation queue for admin review.
 */
class ReviewModerationService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function submit(User $author, Company $company, array $data): CompanyReview
    {
        $this->guardEligibility($author, $company);

        $profile = EmployeeProfile::query()->where('user_id', $author->id)->first();
        $hasApplication = $profile && Application::query()
            ->where('employee_profile_id', $profile->id)
            ->whereHas('job', fn ($q) => $q->where('company_id', $company->id))
            ->exists();

        $autoApprove = $hasApplication;

        return DB::transaction(function () use ($author, $company, $data, $autoApprove): CompanyReview {
            return CompanyReview::query()->updateOrCreate(
                ['company_id' => $company->id, 'user_id' => $author->id],
                array_merge($data, [
                    'status' => $autoApprove ? ReviewStatus::Approved : ReviewStatus::Pending,
                    'moderated_at' => $autoApprove ? now() : null,
                    'moderated_by_user_id' => null,
                ]),
            );
        });
    }

    public function approve(CompanyReview $review, User $moderator, ?string $note = null): CompanyReview
    {
        $review->forceFill([
            'status' => ReviewStatus::Approved,
            'moderated_by_user_id' => $moderator->id,
            'moderated_at' => now(),
            'moderation_note' => $note,
        ])->save();

        return $review;
    }

    public function reject(CompanyReview $review, User $moderator, ?string $note = null): CompanyReview
    {
        $review->forceFill([
            'status' => ReviewStatus::Rejected,
            'moderated_by_user_id' => $moderator->id,
            'moderated_at' => now(),
            'moderation_note' => $note,
        ])->save();

        return $review;
    }

    public function respond(CompanyReview $review, User $employer, string $response): CompanyReview
    {
        $review->forceFill([
            'responded_by_user_id' => $employer->id,
            'response_body' => $response,
            'responded_at' => now(),
        ])->save();

        return $review;
    }

    public function refreshHelpfulCount(CompanyReview $review): void
    {
        $review->forceFill(['helpful_count' => $review->helpfulVotes()->count()])->save();
    }

    /**
     * Block reviews from users who own the company (no self-reviews) and from
     * users who haven't completed at least the email-verification step.
     */
    private function guardEligibility(User $author, Company $company): void
    {
        if ($company->owner_id === $author->id) {
            throw new RuntimeException('Pemilik perusahaan tidak dapat menulis review.');
        }

        if (! $author->email_verified_at) {
            throw new RuntimeException('Akun harus terverifikasi sebelum menulis review.');
        }
    }
}
