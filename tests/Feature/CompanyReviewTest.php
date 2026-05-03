<?php

use App\Enums\ApplicationStatus;
use App\Enums\ReviewStatus;
use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\ReviewHelpfulVote;
use App\Models\User;
use App\Services\Reviews\ReviewModerationService;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([
        SettingSeeder::class,
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);
});

function makeReviewContext(): array
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);
    $reviewer = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $reviewer->id]);

    return compact('owner', 'company', 'job', 'reviewer', 'profile');
}

function reviewPayload(array $overrides = []): array
{
    return array_merge([
        'title' => 'Pengalaman luar biasa',
        'rating' => 4,
        'pros' => 'Tim yang suportif',
        'cons' => 'Beberapa proses birokratis',
        'employment_status' => 'current',
        'job_title' => 'Software Engineer',
        'would_recommend' => true,
        'is_anonymous' => true,
    ], $overrides);
}

test('verified applicant submits review and it is auto-approved', function () {
    ['company' => $company, 'job' => $job, 'reviewer' => $reviewer, 'profile' => $profile] = makeReviewContext();

    Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Reviewed,
    ]);

    $this->actingAs($reviewer)
        ->post("/employee/company-reviews/companies/{$company->slug}", reviewPayload())
        ->assertRedirect();

    $review = CompanyReview::query()->first();
    expect($review)->not->toBeNull();
    expect($review->status)->toBe(ReviewStatus::Approved);
    expect($review->moderated_at)->not->toBeNull();
});

test('non-applicant review goes into pending moderation', function () {
    ['company' => $company, 'reviewer' => $reviewer] = makeReviewContext();

    $this->actingAs($reviewer)
        ->post("/employee/company-reviews/companies/{$company->slug}", reviewPayload())
        ->assertRedirect();

    $review = CompanyReview::query()->first();
    expect($review->status)->toBe(ReviewStatus::Pending);
});

test('company owner with employee role cannot review own company', function () {
    ['owner' => $owner, 'company' => $company] = makeReviewContext();

    // Owner posts on the employer side has no review route. The route guards via
    // role:employee, so an employer is auto-403. Even if someone bypassed roles,
    // the service throws because owner_id matches.
    $this->actingAs($owner)
        ->post("/employee/company-reviews/companies/{$company->slug}", reviewPayload())
        ->assertForbidden();

    expect(CompanyReview::query()->count())->toBe(0);
});

test('service rejects review when author owns the company directly', function () {
    ['owner' => $owner, 'company' => $company] = makeReviewContext();

    expect(fn () => app(ReviewModerationService::class)->submit($owner, $company, reviewPayload()))
        ->toThrow(RuntimeException::class);
});

test('user can edit and update own review', function () {
    ['company' => $company, 'reviewer' => $reviewer] = makeReviewContext();

    $this->actingAs($reviewer)->post("/employee/company-reviews/companies/{$company->slug}", reviewPayload());
    $review = CompanyReview::query()->first();

    $this->actingAs($reviewer)
        ->patch("/employee/company-reviews/{$review->id}", reviewPayload(['title' => 'Updated title', 'rating' => 5]))
        ->assertRedirect();

    expect($review->fresh()->title)->toBe('Updated title');
    expect($review->fresh()->rating)->toBe(5);
});

test('user cannot edit another user review', function () {
    ['company' => $company, 'reviewer' => $reviewer] = makeReviewContext();
    $this->actingAs($reviewer)->post("/employee/company-reviews/companies/{$company->slug}", reviewPayload());
    $review = CompanyReview::query()->first();

    $intruder = User::factory()->employee()->create();

    $this->actingAs($intruder)
        ->patch("/employee/company-reviews/{$review->id}", reviewPayload())
        ->assertForbidden();
});

test('admin can approve pending review', function () {
    ['company' => $company, 'reviewer' => $reviewer] = makeReviewContext();
    $this->actingAs($reviewer)->post("/employee/company-reviews/companies/{$company->slug}", reviewPayload());
    $review = CompanyReview::query()->first();
    expect($review->status)->toBe(ReviewStatus::Pending);

    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)
        ->post("/admin/reviews/{$review->id}/approve", ['note' => 'Sesuai pedoman'])
        ->assertRedirect();

    $review->refresh();
    expect($review->status)->toBe(ReviewStatus::Approved);
    expect($review->moderated_by_user_id)->toBe($admin->id);
});

test('admin can reject pending review', function () {
    ['company' => $company, 'reviewer' => $reviewer] = makeReviewContext();
    $this->actingAs($reviewer)->post("/employee/company-reviews/companies/{$company->slug}", reviewPayload());
    $review = CompanyReview::query()->first();

    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)
        ->post("/admin/reviews/{$review->id}/reject", ['note' => 'Konten tidak sesuai'])
        ->assertRedirect();

    expect($review->fresh()->status)->toBe(ReviewStatus::Rejected);
});

test('non-admin cannot moderate', function () {
    ['company' => $company, 'reviewer' => $reviewer] = makeReviewContext();
    $this->actingAs($reviewer)->post("/employee/company-reviews/companies/{$company->slug}", reviewPayload());
    $review = CompanyReview::query()->first();

    $other = User::factory()->employee()->create();
    $this->actingAs($other)
        ->post("/admin/reviews/{$review->id}/approve")
        ->assertForbidden();
});

test('employer can respond to approved review', function () {
    ['owner' => $owner, 'company' => $company, 'reviewer' => $reviewer] = makeReviewContext();
    $this->actingAs($reviewer)->post("/employee/company-reviews/companies/{$company->slug}", reviewPayload());
    $review = CompanyReview::query()->first();
    $review->update(['status' => ReviewStatus::Approved]);

    $this->actingAs($owner)
        ->post("/employer/company-reviews/{$review->id}/respond", ['response_body' => 'Terima kasih atas masukannya.'])
        ->assertRedirect();

    expect($review->fresh()->response_body)->toBe('Terima kasih atas masukannya.');
    expect($review->fresh()->responded_by_user_id)->toBe($owner->id);
});

test('employer cannot respond to another company review', function () {
    ['company' => $company, 'reviewer' => $reviewer] = makeReviewContext();
    $this->actingAs($reviewer)->post("/employee/company-reviews/companies/{$company->slug}", reviewPayload());
    $review = CompanyReview::query()->first();

    $other = User::factory()->employer()->create();
    Company::factory()->approved()->create(['owner_id' => $other->id]);

    $this->actingAs($other)
        ->post("/employer/company-reviews/{$review->id}/respond", ['response_body' => 'Spoof'])
        ->assertForbidden();
});

test('public reviews page shows only approved reviews', function () {
    ['company' => $company, 'reviewer' => $reviewer] = makeReviewContext();
    CompanyReview::factory()->approved()->create(['company_id' => $company->id, 'user_id' => $reviewer->id]);

    CompanyReview::factory()->create([
        'company_id' => $company->id,
        'user_id' => User::factory()->employee()->create()->id,
        'status' => ReviewStatus::Pending,
    ]);

    $this->get("/companies/{$company->slug}/reviews")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('reviews.total', 1)->where('stats.total', 1));
});

test('helpful vote toggles and refreshes counter', function () {
    ['company' => $company, 'reviewer' => $reviewer] = makeReviewContext();
    $review = CompanyReview::factory()->approved()->create(['company_id' => $company->id, 'user_id' => $reviewer->id]);

    $voter = User::factory()->employee()->create();

    $this->actingAs($voter)
        ->post("/companies/reviews/{$review->id}/helpful")
        ->assertRedirect();

    expect($review->fresh()->helpful_count)->toBe(1);
    expect(ReviewHelpfulVote::query()->count())->toBe(1);

    $this->actingAs($voter)
        ->post("/companies/reviews/{$review->id}/helpful")
        ->assertRedirect();

    expect($review->fresh()->helpful_count)->toBe(0);
});

test('helpful vote rejected for non-approved review', function () {
    ['company' => $company, 'reviewer' => $reviewer] = makeReviewContext();
    $pending = CompanyReview::factory()->create([
        'company_id' => $company->id,
        'user_id' => $reviewer->id,
        'status' => ReviewStatus::Pending,
    ]);

    $voter = User::factory()->employee()->create();
    $this->actingAs($voter)
        ->post("/companies/reviews/{$pending->id}/helpful")
        ->assertForbidden();
});

test('one review per company per user constraint', function () {
    ['company' => $company, 'reviewer' => $reviewer] = makeReviewContext();
    $this->actingAs($reviewer)->post("/employee/company-reviews/companies/{$company->slug}", reviewPayload());
    $this->actingAs($reviewer)->post("/employee/company-reviews/companies/{$company->slug}", reviewPayload(['title' => 'Second attempt']));

    expect(CompanyReview::query()->where('company_id', $company->id)->where('user_id', $reviewer->id)->count())->toBe(1);
});
