<?php

use App\Enums\ReviewStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\CompanyReview;
use App\Models\CompanySubscription;
use App\Models\EmployeeProfile;
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

function opsToken(User $user): array
{
    $token = test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()->json('data.tokens.access_token');

    return ['Authorization' => 'Bearer '.$token];
}

/**
 * An employer with an active subscription (talent search is gated on one).
 *
 * @return array{0: User, 1: Company}
 */
function subscribedEmployer(): array
{
    $user = User::factory()->employer()->create(['password' => 'password']);
    $company = Company::factory()->approved()->create([
        'owner_id' => $user->id,
        'onboarding_completed_at' => now(),
    ]);

    CompanySubscription::factory()->create([
        'company_id' => $company->id,
        'plan_id' => SubscriptionPlan::factory()->create()->id,
        'status' => SubscriptionStatus::Active,
        'starts_at' => now()->subDay(),
        'ends_at' => now()->addMonth(),
    ]);

    return [$user, $company];
}

function candidateWithVisibility(string $visibility, string $name = 'Kandidat'): EmployeeProfile
{
    $user = User::factory()->employee()->create(['name' => $name]);

    return EmployeeProfile::factory()->create([
        'user_id' => $user->id,
        'visibility' => $visibility,
        'is_open_to_work' => true,
    ]);
}

describe('team', function (): void {
    it('lists members and marks the owner', function (): void {
        [$user, $company] = subscribedEmployer();

        $this->withHeaders(opsToken($user))
            ->getJson('/api/v1/employer/team')
            ->assertOk()
            ->assertJsonPath('meta.owner_id', $company->owner_id);
    });

    it('invites an existing employer account', function (): void {
        [$user, $company] = subscribedEmployer();

        // InviteTeamMemberRequest requires the invitee to already hold an
        // employer account; a jobseeker cannot be added to a company team.
        $invitee = User::factory()->employer()->create(['email' => 'recruiter@acme.test']);

        $this->withHeaders(opsToken($user))
            ->postJson('/api/v1/employer/team', ['email' => 'recruiter@acme.test', 'role' => 'recruiter'])
            ->assertCreated();

        $this->assertDatabaseHas('company_members', [
            'company_id' => $company->id,
            'user_id' => $invitee->id,
            'role' => 'recruiter',
        ]);
    });

    it('refuses to invite a jobseeker account', function (): void {
        [$user] = subscribedEmployer();
        User::factory()->employee()->create(['email' => 'seeker@acme.test']);

        $this->withHeaders(opsToken($user))
            ->postJson('/api/v1/employer/team', ['email' => 'seeker@acme.test', 'role' => 'recruiter'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    });

    it('rejects an email with no account', function (): void {
        [$user] = subscribedEmployer();

        // exists:users,email catches this before the controller's own guard.
        $this->withHeaders(opsToken($user))
            ->postJson('/api/v1/employer/team', ['email' => 'ghost@nowhere.test', 'role' => 'recruiter'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    });

    it('refuses to remove the owner', function (): void {
        [$user, $company] = subscribedEmployer();

        $member = CompanyMember::factory()->create([
            'company_id' => $company->id,
            'user_id' => $company->owner_id,
            'role' => 'admin',
        ]);

        $this->withHeaders(opsToken($user))
            ->deleteJson('/api/v1/employer/team/'.$member->id)
            ->assertStatus(422);
    });
});

describe('offices', function (): void {
    it('creates an office and keeps a single headquarters', function (): void {
        [$user, $company] = subscribedEmployer();
        $headers = opsToken($user);

        $this->withHeaders($headers)->postJson('/api/v1/employer/offices', [
            'label' => 'HQ Jakarta',
            'is_headquarter' => true,
        ])->assertCreated();

        $this->withHeaders($headers)->postJson('/api/v1/employer/offices', [
            'label' => 'Bandung Branch',
            'is_headquarter' => true,
        ])->assertCreated();

        // Promoting the second must demote the first.
        expect($company->offices()->where('is_headquarter', true)->count())->toBe(1);
        expect($company->offices()->where('is_headquarter', true)->first()->label)->toBe('Bandung Branch');
    });

    it('404s updating another company office', function (): void {
        [$mine] = subscribedEmployer();
        [, $theirCompany] = subscribedEmployer();

        $office = $theirCompany->offices()->create(['label' => 'Theirs', 'is_headquarter' => false]);

        $this->withHeaders(opsToken($mine))
            ->putJson('/api/v1/employer/offices/'.$office->id, ['label' => 'Hacked', 'is_headquarter' => false])
            ->assertStatus(404);
    });
});

describe('talent search', function (): void {
    it('finds a candidate who chose recruiter_only', function (): void {
        // Regression: the filter only accepted 'public' and the legacy
        // 'employers', so everyone who picked "Recruiter Only" -- meaning
        // recruiters may find me -- was invisible to recruiters.
        [$user] = subscribedEmployer();
        candidateWithVisibility('recruiter_only', 'Wants To Be Found');

        $response = $this->withHeaders(opsToken($user))->getJson('/api/v1/employer/talent')->assertOk();

        expect(collect($response->json('data'))->pluck('name'))->toContain('Wants To Be Found');
    });

    it('still finds public and legacy employers visibility', function (): void {
        [$user] = subscribedEmployer();
        candidateWithVisibility('public', 'Public One');
        candidateWithVisibility('employers', 'Legacy One');

        $names = collect($this->withHeaders(opsToken($user))
            ->getJson('/api/v1/employer/talent')->assertOk()->json('data'))->pluck('name');

        expect($names)->toContain('Public One')->toContain('Legacy One');
    });

    it('never surfaces a private candidate', function (): void {
        [$user] = subscribedEmployer();
        candidateWithVisibility('private', 'Hidden One');

        $names = collect($this->withHeaders(opsToken($user))
            ->getJson('/api/v1/employer/talent')->assertOk()->json('data'))->pluck('name');

        expect($names)->not->toContain('Hidden One');
    });

    it('403s opening a private candidate directly', function (): void {
        [$user] = subscribedEmployer();
        $profile = candidateWithVisibility('private');

        $this->withHeaders(opsToken($user))
            ->getJson('/api/v1/employer/talent/'.$profile->id)
            ->assertStatus(403);
    });

    it('requires an active subscription', function (): void {
        $user = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->approved()->create([
            'owner_id' => $user->id,
            'onboarding_completed_at' => now(),
        ]);

        $this->withHeaders(opsToken($user))
            ->getJson('/api/v1/employer/talent')
            ->assertStatus(403)
            ->assertJsonPath('code', 'subscription_required');
    });

    it('saves and unsaves a candidate idempotently', function (): void {
        [$user, $company] = subscribedEmployer();
        $profile = candidateWithVisibility('public');
        $headers = opsToken($user);

        $this->withHeaders($headers)->postJson('/api/v1/employer/talent/'.$profile->id.'/save')->assertCreated();
        $this->withHeaders($headers)->postJson('/api/v1/employer/talent/'.$profile->id.'/save')->assertCreated();

        expect($company->savedCandidates ?? collect())->not->toBeNull();
        $this->assertDatabaseCount('saved_candidates', 1);

        $this->withHeaders($headers)->deleteJson('/api/v1/employer/talent/'.$profile->id.'/save')->assertOk();
        $this->assertDatabaseCount('saved_candidates', 0);
    });

    it('sends outreach to a candidate', function (): void {
        [$user] = subscribedEmployer();
        $profile = candidateWithVisibility('public');

        $this->withHeaders(opsToken($user))
            ->postJson('/api/v1/employer/talent/'.$profile->id.'/outreach', [
                'subject' => 'Peluang kerja',
                'body' => 'Halo, kami tertarik dengan profil Anda.',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('candidate_outreach_messages', [
            'candidate_profile_id' => $profile->id,
            'status' => 'sent',
        ]);
    });
});

describe('review responses', function (): void {
    it('lets the company respond to a review about it', function (): void {
        [$user, $company] = subscribedEmployer();
        $review = CompanyReview::factory()->create([
            'company_id' => $company->id,
            'status' => ReviewStatus::Approved,
        ]);

        $this->withHeaders(opsToken($user))
            ->postJson('/api/v1/employer/reviews/'.$review->id.'/respond', [
                'response_body' => 'Terima kasih atas masukannya.',
            ])
            ->assertOk()
            ->assertJsonPath('data.response_body', 'Terima kasih atas masukannya.');
    });

    it('403s responding to another company review', function (): void {
        [$mine] = subscribedEmployer();
        [, $theirCompany] = subscribedEmployer();

        $review = CompanyReview::factory()->create([
            'company_id' => $theirCompany->id,
            'status' => ReviewStatus::Approved,
        ]);

        $this->withHeaders(opsToken($mine))
            ->postJson('/api/v1/employer/reviews/'.$review->id.'/respond', ['response_body' => 'Nope'])
            ->assertStatus(403);
    });
});

describe('message templates', function (): void {
    it('creates and lists templates', function (): void {
        [$user] = subscribedEmployer();
        $headers = opsToken($user);

        $this->withHeaders($headers)->postJson('/api/v1/employer/message-templates', [
            'name' => 'Undangan Interview',
            'category' => 'invitation',
            'body' => 'Halo {{name}}, kami ingin mengundang Anda.',
            'is_active' => true,
        ])->assertCreated();

        $this->withHeaders($headers)->getJson('/api/v1/employer/message-templates')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Undangan Interview');
    });

    it('403s editing another company template', function (): void {
        [$mine] = subscribedEmployer();
        [$theirs] = subscribedEmployer();

        $id = $this->withHeaders(opsToken($theirs))->postJson('/api/v1/employer/message-templates', [
            'name' => 'Theirs', 'category' => 'offer', 'body' => 'x', 'is_active' => true,
        ])->assertCreated()->json('data.id');

        $this->withHeaders(opsToken($mine))
            ->putJson('/api/v1/employer/message-templates/'.$id, [
                'name' => 'Hacked', 'category' => 'offer', 'body' => 'x', 'is_active' => true,
            ])
            ->assertStatus(403);
    });
});
