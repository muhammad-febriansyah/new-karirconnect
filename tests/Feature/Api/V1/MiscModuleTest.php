<?php

use App\Enums\ReviewStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\SubscriptionTier;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\CompanySubscription;
use App\Models\EmployeeProfile;
use App\Models\SalarySubmission;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class, ProvinceCitySeeder::class, LookupSeeder::class]);
    Notification::fake();
});

function miscToken(User $user): array
{
    $token = test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()->json('data.tokens.access_token');

    return ['Authorization' => 'Bearer '.$token];
}

function miscSeeker(): User
{
    $user = User::factory()->employee()->create(['password' => 'password']);
    EmployeeProfile::factory()->create(['user_id' => $user->id]);

    return $user;
}

describe('company reviews', function (): void {
    it('lists only approved reviews publicly', function (): void {
        $company = Company::factory()->approved()->create();

        CompanyReview::factory()->create([
            'company_id' => $company->id,
            'title' => 'Published',
            'status' => ReviewStatus::Approved,
        ]);
        CompanyReview::factory()->create([
            'company_id' => $company->id,
            'title' => 'Still Pending',
            'status' => ReviewStatus::Pending,
        ]);

        $response = $this->getJson('/api/v1/companies/'.$company->slug.'/reviews')->assertOk();

        expect($response->json('data'))->toHaveCount(1)
            ->and($response->json('data.0.title'))->toBe('Published');
    });

    it('hides the author of an anonymous review', function (): void {
        $company = Company::factory()->approved()->create();
        $author = User::factory()->create(['name' => 'Budi Santoso', 'avatar_path' => 'avatars/x.jpg']);

        CompanyReview::factory()->create([
            'company_id' => $company->id,
            'user_id' => $author->id,
            'status' => ReviewStatus::Approved,
            'is_anonymous' => true,
        ]);

        $response = $this->getJson('/api/v1/companies/'.$company->slug.'/reviews')->assertOk();

        expect($response->json('data.0.author_name'))->toBeNull()
            // The avatar identifies the author just as well as the name.
            ->and($response->json('data.0.author_avatar_url'))->toBeNull()
            ->and(json_encode($response->json()))->not->toContain('Budi Santoso');
    });

    it('submits a review as pending moderation', function (): void {
        $company = Company::factory()->approved()->create();
        $user = miscSeeker();

        $this->withHeaders(miscToken($user))
            ->postJson('/api/v1/companies/'.$company->slug.'/reviews', [
                'title' => 'Tempat kerja bagus',
                'rating' => 4,
                'employment_status' => 'current',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('company_reviews', [
            'company_id' => $company->id,
            'user_id' => $user->id,
            'status' => 'pending',
        ]);
    });

    it('rejects an out of range rating', function (): void {
        $company = Company::factory()->approved()->create();
        $user = miscSeeker();

        $this->withHeaders(miscToken($user))
            ->postJson('/api/v1/companies/'.$company->slug.'/reviews', [
                'title' => 'Bad',
                'rating' => 9,
                'employment_status' => 'current',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('rating');
    });

    it('sends an edited review back through moderation', function (): void {
        $user = miscSeeker();
        $review = CompanyReview::factory()->create([
            'user_id' => $user->id,
            'status' => ReviewStatus::Approved,
        ]);

        $this->withHeaders(miscToken($user))
            ->putJson('/api/v1/reviews/'.$review->id, [
                'title' => 'Rewritten after approval',
                'rating' => 1,
                'employment_status' => 'former',
            ])
            ->assertOk();

        // An approved review must not be silently rewritten into something
        // nobody moderated.
        expect($review->fresh()->status)->toBe(ReviewStatus::Pending);
    });

    it('refuses to edit another user review', function (): void {
        $mine = miscSeeker();
        $review = CompanyReview::factory()->create(['user_id' => miscSeeker()->id]);

        $this->withHeaders(miscToken($mine))
            ->putJson('/api/v1/reviews/'.$review->id, [
                'title' => 'Hacked',
                'rating' => 1,
                'employment_status' => 'current',
            ])
            ->assertStatus(403);
    });

    it('marks a review helpful idempotently', function (): void {
        $user = miscSeeker();
        $review = CompanyReview::factory()->create(['status' => ReviewStatus::Approved]);
        $headers = miscToken($user);

        $this->withHeaders($headers)->postJson('/api/v1/reviews/'.$review->id.'/helpful')->assertOk();
        $this->withHeaders($headers)->postJson('/api/v1/reviews/'.$review->id.'/helpful')->assertOk();

        expect($review->fresh()->helpful_count)->toBe(1);
    });

    it('removes a helpful vote', function (): void {
        $user = miscSeeker();
        $review = CompanyReview::factory()->create(['status' => ReviewStatus::Approved]);
        $headers = miscToken($user);

        $this->withHeaders($headers)->postJson('/api/v1/reviews/'.$review->id.'/helpful')->assertOk();
        $this->withHeaders($headers)->deleteJson('/api/v1/reviews/'.$review->id.'/helpful')->assertOk();

        expect($review->fresh()->helpful_count)->toBe(0);
    });
});

describe('salary', function (): void {
    it('exposes aggregated insights publicly', function (): void {
        $this->getJson('/api/v1/salary-insights')
            ->assertOk()
            ->assertJsonStructure(['data' => ['aggregate', 'top_companies', 'recent_submissions']]);
    });

    it('submits salary data as pending', function (): void {
        $user = miscSeeker();

        $this->withHeaders(miscToken($user))
            ->postJson('/api/v1/salary-submissions', [
                'job_title' => 'Backend Engineer',
                'experience_level' => 'mid',
                'experience_years' => 4,
                'employment_type' => 'full_time',
                'salary_idr' => 15_000_000,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');
    });

    it('cannot self-approve a submission', function (): void {
        // status is server-set; a client-supplied one must be ignored.
        $user = miscSeeker();

        $this->withHeaders(miscToken($user))
            ->postJson('/api/v1/salary-submissions', [
                'job_title' => 'Backend Engineer',
                'experience_level' => 'mid',
                'experience_years' => 4,
                'employment_type' => 'full_time',
                'salary_idr' => 15_000_000,
                'status' => 'approved',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');
    });

    it('rejects an implausibly low salary', function (): void {
        $user = miscSeeker();

        $this->withHeaders(miscToken($user))
            ->postJson('/api/v1/salary-submissions', [
                'job_title' => 'Backend Engineer',
                'experience_level' => 'mid',
                'experience_years' => 4,
                'employment_type' => 'full_time',
                'salary_idr' => 5000,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('salary_idr');
    });

    it('refuses to delete another user submission', function (): void {
        $mine = miscSeeker();
        $submission = SalarySubmission::factory()->create(['user_id' => miscSeeker()->id]);

        $this->withHeaders(miscToken($mine))
            ->deleteJson('/api/v1/salary-submissions/'.$submission->id)
            ->assertStatus(403);
    });
});

describe('messaging', function (): void {
    it('starts a conversation and sends a message', function (): void {
        $a = miscSeeker();
        $b = miscSeeker();

        $conversationId = $this->withHeaders(miscToken($a))
            ->postJson('/api/v1/conversations/start', ['user_id' => $b->id])
            ->assertCreated()
            ->json('data.id');

        $this->withHeaders(miscToken($a))
            ->postJson('/api/v1/conversations/'.$conversationId.'/messages', ['body' => 'Halo'])
            ->assertCreated()
            ->assertJsonPath('data.body', 'Halo');
    });

    it('refuses a conversation with yourself', function (): void {
        $user = miscSeeker();

        $this->withHeaders(miscToken($user))
            ->postJson('/api/v1/conversations/start', ['user_id' => $user->id])
            ->assertStatus(422)
            ->assertJsonPath('code', 'self_conversation');
    });

    it('blocks an outsider from reading a conversation', function (): void {
        $a = miscSeeker();
        $b = miscSeeker();
        $outsider = miscSeeker();

        $conversationId = $this->withHeaders(miscToken($a))
            ->postJson('/api/v1/conversations/start', ['user_id' => $b->id])
            ->assertCreated()->json('data.id');

        $this->withHeaders(miscToken($outsider))
            ->getJson('/api/v1/conversations/'.$conversationId)
            ->assertStatus(403);
    });

    it('requires an employer to have a subscription before contacting candidates', function (): void {
        $employer = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->approved()->create([
            'owner_id' => $employer->id,
            'onboarding_completed_at' => now(),
        ]);
        $candidate = miscSeeker();

        $this->withHeaders(miscToken($employer))
            ->postJson('/api/v1/conversations/start', ['user_id' => $candidate->id])
            ->assertStatus(403)
            ->assertJsonPath('code', 'subscription_required');
    });
});

describe('billing', function (): void {
    it('lists plans with the current subscription', function (): void {
        $employer = User::factory()->employer()->create(['password' => 'password']);
        $company = Company::factory()->approved()->create([
            'owner_id' => $employer->id,
            'onboarding_completed_at' => now(),
        ]);
        $plan = SubscriptionPlan::factory()->create(['is_active' => true, 'tier' => SubscriptionTier::Pro]);
        CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonth(),
        ]);

        $this->withHeaders(miscToken($employer))
            ->getJson('/api/v1/employer/billing/plans')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current', 'trial_used']]);
    });

    it('refuses to sell the trial plan', function (): void {
        // Trial is granted once at onboarding; buying it would route around the
        // one-time guard.
        $employer = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->approved()->create([
            'owner_id' => $employer->id,
            'onboarding_completed_at' => now(),
        ]);
        $trial = SubscriptionPlan::factory()->create([
            'is_active' => true,
            'tier' => SubscriptionTier::Trial,
            'slug' => 'trial-plan',
        ]);

        $this->withHeaders(miscToken($employer))
            ->postJson('/api/v1/employer/billing/plans/'.$trial->slug.'/checkout')
            ->assertStatus(422)
            ->assertJsonPath('code', 'trial_not_purchasable');
    });

    it('404s checkout on an inactive plan', function (): void {
        $employer = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->approved()->create([
            'owner_id' => $employer->id,
            'onboarding_completed_at' => now(),
        ]);
        $plan = SubscriptionPlan::factory()->create(['is_active' => false, 'slug' => 'retired-plan']);

        $this->withHeaders(miscToken($employer))
            ->postJson('/api/v1/employer/billing/plans/'.$plan->slug.'/checkout')
            ->assertStatus(404);
    });

    it('does not leak another company orders', function (): void {
        $mine = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->approved()->create([
            'owner_id' => $mine->id,
            'onboarding_completed_at' => now(),
        ]);

        $this->withHeaders(miscToken($mine))
            ->getJson('/api/v1/employer/billing/orders/NONEXISTENT-REF')
            ->assertStatus(404);
    });
});
