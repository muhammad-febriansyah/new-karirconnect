<?php

use App\Enums\ExperienceLevel;
use App\Enums\SubscriptionStatus;
use App\Models\CandidateOutreachMessage;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\EmployeeProfile;
use App\Models\SavedCandidate;
use App\Models\Skill;
use App\Models\SubscriptionPlan;
use App\Models\TalentSearchLog;
use App\Models\User;
use App\Notifications\CandidateOutreachReceivedNotification;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Database\Seeders\SubscriptionPlanSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function (): void {
    $this->seed([
        SettingSeeder::class,
        ProvinceCitySeeder::class,
        LookupSeeder::class,
        SubscriptionPlanSeeder::class,
    ]);
});

function makeTalentEmployer(?string $planSlug = 'starter'): array
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    if ($planSlug !== null) {
        $plan = SubscriptionPlan::query()->where('slug', $planSlug)->firstOrFail();
        CompanySubscription::query()->create([
            'company_id' => $company->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now(),
            'ends_at' => now()->addDays(30),
            'jobs_posted_count' => 0,
            'featured_credits_remaining' => $plan->featured_credits,
            'ai_credits_remaining' => $plan->ai_interview_credits,
            'auto_renew' => false,
        ]);
    }

    return compact('owner', 'company');
}

function makeCandidate(array $overrides = []): EmployeeProfile
{
    $user = User::factory()->employee()->create();

    return EmployeeProfile::factory()->create(array_merge([
        'user_id' => $user->id,
        'visibility' => 'public',
        'is_open_to_work' => true,
        'experience_level' => ExperienceLevel::Mid,
        'expected_salary_min' => 10000000,
        'expected_salary_max' => 15000000,
    ], $overrides));
}

test('talent search returns matching candidates and excludes private profiles', function () {
    ['owner' => $owner] = makeTalentEmployer();

    $public = makeCandidate(['headline' => 'Senior PHP Engineer']);
    makeCandidate(['headline' => 'Senior PHP Engineer', 'visibility' => 'private']);

    $this->actingAs($owner)
        ->get('/employer/talent-search?keyword=PHP')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('employer/talent-search/index')
            ->where('results.total', 1)
            ->where('results.data.0.id', $public->id)
        );
});

test('every search creates a log entry', function () {
    ['owner' => $owner, 'company' => $company] = makeTalentEmployer();
    makeCandidate(['headline' => 'Designer']);

    $this->actingAs($owner)->get('/employer/talent-search?keyword=Designer')->assertOk();

    $log = TalentSearchLog::query()->where('company_id', $company->id)->first();
    expect($log)->not->toBeNull();
    expect($log->result_count)->toBe(1);
    expect($log->filters['keyword'])->toBe('Designer');
});

test('subscription middleware blocks employer without active plan', function () {
    ['owner' => $owner] = makeTalentEmployer(null);

    $this->actingAs($owner)
        ->get('/employer/talent-search')
        ->assertRedirect(route('employer.billing.index'));
});

test('starter plan can access talent search', function () {
    ['owner' => $owner] = makeTalentEmployer('starter');
    makeCandidate();

    $this->actingAs($owner)->get('/employer/talent-search')->assertOk();
});

test('expired subscription is treated as inactive', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $plan = SubscriptionPlan::query()->where('slug', 'starter')->first();
    CompanySubscription::factory()->create([
        'company_id' => $company->id,
        'plan_id' => $plan->id,
        'status' => SubscriptionStatus::Active,
        'starts_at' => now()->subDays(40),
        'ends_at' => now()->subDay(),
    ]);

    $this->actingAs($owner)
        ->get('/employer/talent-search')
        ->assertRedirect(route('employer.billing.index'));
});

test('save and unsave candidate', function () {
    ['owner' => $owner, 'company' => $company] = makeTalentEmployer();
    $candidate = makeCandidate();

    $this->actingAs($owner)
        ->post("/employer/talent-search/{$candidate->id}/save", ['label' => 'Hot lead', 'note' => 'Great match'])
        ->assertRedirect();

    expect(SavedCandidate::query()->where('company_id', $company->id)->count())->toBe(1);

    $this->actingAs($owner)
        ->delete("/employer/talent-search/{$candidate->id}/save")
        ->assertRedirect();

    expect(SavedCandidate::query()->where('company_id', $company->id)->count())->toBe(0);
});

test('cannot save private candidate', function () {
    ['owner' => $owner] = makeTalentEmployer();
    $hidden = makeCandidate(['visibility' => 'private']);

    $this->actingAs($owner)
        ->post("/employer/talent-search/{$hidden->id}/save")
        ->assertForbidden();
});

test('outreach creates message and notifies candidate', function () {
    Notification::fake();
    ['owner' => $owner] = makeTalentEmployer();
    $candidate = makeCandidate();

    $this->actingAs($owner)
        ->post("/employer/talent-search/{$candidate->id}/outreach", [
            'subject' => 'Mari ngobrol soal posisi senior',
            'body' => 'Halo, kami tertarik dengan profil Anda...',
        ])
        ->assertRedirect();

    expect(CandidateOutreachMessage::query()->count())->toBe(1);
    Notification::assertSentTo($candidate->user, CandidateOutreachReceivedNotification::class);
});

test('candidate sees their inbox and can reply', function () {
    ['owner' => $owner, 'company' => $company] = makeTalentEmployer();
    $candidate = makeCandidate();

    $message = CandidateOutreachMessage::query()->create([
        'company_id' => $company->id,
        'sender_user_id' => $owner->id,
        'candidate_profile_id' => $candidate->id,
        'candidate_user_id' => $candidate->user_id,
        'subject' => 'Hi',
        'body' => 'Tertarik berbicara?',
        'status' => 'sent',
        'sent_at' => now(),
    ]);

    $this->actingAs($candidate->user)->get('/employee/messages')->assertOk();

    $this->actingAs($candidate->user)
        ->post("/employee/messages/{$message->id}/reply", ['reply_body' => 'Iya, saya tertarik.'])
        ->assertRedirect();

    expect($message->fresh()->reply_body)->toBe('Iya, saya tertarik.');
    expect($message->fresh()->status)->toBe('replied');
});

test('candidate cannot reply to another candidate message', function () {
    ['owner' => $owner, 'company' => $company] = makeTalentEmployer();
    $candidate = makeCandidate();

    $message = CandidateOutreachMessage::query()->create([
        'company_id' => $company->id,
        'sender_user_id' => $owner->id,
        'candidate_profile_id' => $candidate->id,
        'candidate_user_id' => $candidate->user_id,
        'subject' => 'Hi',
        'body' => 'Halo',
        'status' => 'sent',
        'sent_at' => now(),
    ]);

    $intruder = User::factory()->employee()->create();

    $this->actingAs($intruder)
        ->post("/employee/messages/{$message->id}/reply", ['reply_body' => 'Spoof'])
        ->assertForbidden();
});

test('search filters by skill', function () {
    ['owner' => $owner] = makeTalentEmployer();

    $skill = Skill::query()->firstOrCreate(['slug' => 'react'], ['name' => 'React']);
    $matching = makeCandidate();
    $matching->skills()->syncWithoutDetaching([$skill->id]);
    makeCandidate();

    $this->actingAs($owner)
        ->get("/employer/talent-search?skill_ids[]={$skill->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('results.total', 1));
});

test('saved candidate index returns paginated rows', function () {
    ['owner' => $owner, 'company' => $company] = makeTalentEmployer();
    $candidate = makeCandidate();

    SavedCandidate::query()->create([
        'company_id' => $company->id,
        'candidate_profile_id' => $candidate->id,
        'saved_by_user_id' => $owner->id,
        'label' => 'Top talent',
        'saved_at' => now(),
    ]);

    $this->actingAs($owner)->get('/employer/talent-search/saved')->assertOk();
});
