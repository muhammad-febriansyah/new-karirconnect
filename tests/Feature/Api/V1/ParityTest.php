<?php

use App\Enums\InterviewStage;
use App\Enums\InterviewStatus;
use App\Models\AiInterviewSession;
use App\Models\Application;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\Interview;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\JobScreeningQuestion;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class, ProvinceCitySeeder::class, LookupSeeder::class]);
    Notification::fake();
});

function parityToken(User $user): array
{
    $token = test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()->json('data.tokens.access_token');

    return ['Authorization' => 'Bearer '.$token];
}

/**
 * @return array{0: User, 1: Company, 2: Job}
 */
function parityEmployer(): array
{
    $user = User::factory()->employer()->create(['password' => 'password']);
    $company = Company::factory()->approved()->create([
        'owner_id' => $user->id,
        'onboarding_completed_at' => now(),
    ]);
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $user->id,
        'job_category_id' => JobCategory::query()->value('id'),
    ]);

    return [$user, $company, $job];
}

describe('screening questions', function (): void {
    it('authors a screening question and appends its order', function (): void {
        // Candidates already answer these when applying; without this an
        // employer on mobile could receive answers but never write questions.
        [$user, , $job] = parityEmployer();
        $headers = parityToken($user);

        $first = $this->withHeaders($headers)->postJson('/api/v1/employer/jobs/'.$job->slug.'/screening-questions', [
            'question' => 'Berapa tahun pengalaman Flutter Anda?',
            'type' => 'number',
            'is_required' => true,
        ])->assertCreated();

        $second = $this->withHeaders($headers)->postJson('/api/v1/employer/jobs/'.$job->slug.'/screening-questions', [
            'question' => 'Bersedia relokasi?',
            'type' => 'yes_no',
            'is_required' => false,
        ])->assertCreated();

        expect($second->json('data.order_number'))->toBeGreaterThan($first->json('data.order_number'));
    });

    it('shows the questions to a candidate on the job detail', function (): void {
        [$user, , $job] = parityEmployer();

        $this->withHeaders(parityToken($user))
            ->postJson('/api/v1/employer/jobs/'.$job->slug.'/screening-questions', [
                'question' => 'Bersedia relokasi?',
                'type' => 'yes_no',
                'is_required' => true,
                'knockout_value' => ['no'],
            ])->assertCreated();

        $response = $this->getJson('/api/v1/jobs/'.$job->slug)->assertOk();

        expect($response->json('data.screening_questions'))->toHaveCount(1);

        // The knockout value is the employer's auto-reject rule; handing it to
        // candidates would tell them exactly which answer disqualifies them.
        expect(json_encode($response->json('data.screening_questions')))->not->toContain('knockout');
    });

    it('404s a question belonging to another job', function (): void {
        [$user, , $job] = parityEmployer();
        [, , $otherJob] = parityEmployer();

        $question = JobScreeningQuestion::factory()->create(['job_id' => $otherJob->id]);

        $this->withHeaders(parityToken($user))
            ->deleteJson('/api/v1/employer/jobs/'.$job->slug.'/screening-questions/'.$question->id)
            ->assertStatus(404);
    });

    it('403s authoring on another company job', function (): void {
        // 403 across every employer job endpoint in this API. The web is split
        // -- its job controller 403s while its screening controller 404s -- and
        // one answer is better than mirroring that inconsistency.
        [$mine] = parityEmployer();
        [, , $theirJob] = parityEmployer();

        $this->withHeaders(parityToken($mine))
            ->postJson('/api/v1/employer/jobs/'.$theirJob->slug.'/screening-questions', [
                'question' => 'Hijacked',
                'type' => 'text',
                'is_required' => false,
            ])
            ->assertStatus(403);

        $this->assertDatabaseMissing('job_screening_questions', ['question' => 'Hijacked']);
    });
});

describe('interview scorecard and stage', function (): void {
    it('submits a scorecard and replaces it on resubmit', function (): void {
        [$user, , $job] = parityEmployer();
        $seeker = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $seeker->id]);
        $application = Application::factory()->create(['job_id' => $job->id, 'employee_profile_id' => $profile->id]);
        $interview = Interview::factory()->create([
            'application_id' => $application->id,
            'scheduled_by_user_id' => $user->id,
            'status' => InterviewStatus::Completed,
        ]);

        $headers = parityToken($user);
        $body = ['overall_score' => 4, 'recommendation' => 'yes'];

        $this->withHeaders($headers)
            ->postJson('/api/v1/employer/interviews/'.$interview->id.'/scorecard', $body)
            ->assertCreated();

        $this->withHeaders($headers)
            ->postJson('/api/v1/employer/interviews/'.$interview->id.'/scorecard', [
                'overall_score' => 5, 'recommendation' => 'strong_yes',
            ])
            ->assertCreated();

        // One scorecard per reviewer, edited rather than stacked.
        expect($interview->scorecards()->count())->toBe(1);
        expect($interview->scorecards()->first()->overall_score)->toBe(5);
    });

    it('changes the interview stage', function (): void {
        [$user, , $job] = parityEmployer();
        $seeker = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $seeker->id]);
        $application = Application::factory()->create(['job_id' => $job->id, 'employee_profile_id' => $profile->id]);
        $interview = Interview::factory()->create([
            'application_id' => $application->id,
            'scheduled_by_user_id' => $user->id,
            'stage' => InterviewStage::Screening,
        ]);

        $this->withHeaders(parityToken($user))
            ->postJson('/api/v1/employer/interviews/'.$interview->id.'/stage', ['stage' => 'technical'])
            ->assertOk();

        expect($interview->fresh()->stage)->toBe(InterviewStage::Technical);
    });

    it('403s a scorecard on another company interview', function (): void {
        [$mine] = parityEmployer();
        [$theirs, , $theirJob] = parityEmployer();

        $seeker = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $seeker->id]);
        $application = Application::factory()->create(['job_id' => $theirJob->id, 'employee_profile_id' => $profile->id]);
        $interview = Interview::factory()->create([
            'application_id' => $application->id,
            'scheduled_by_user_id' => $theirs->id,
        ]);

        $this->withHeaders(parityToken($mine))
            ->postJson('/api/v1/employer/interviews/'.$interview->id.'/scorecard', [
                'overall_score' => 1, 'recommendation' => 'strong_no',
            ])
            ->assertStatus(403);
    });
});

describe('bulk interview scheduling', function (): void {
    it('schedules many candidates and reports per-row outcomes', function (): void {
        [$user, , $job] = parityEmployer();

        $applications = collect(range(1, 3))->map(function () use ($job) {
            $seeker = User::factory()->employee()->create();
            $profile = EmployeeProfile::factory()->create(['user_id' => $seeker->id]);

            return Application::factory()->create(['job_id' => $job->id, 'employee_profile_id' => $profile->id]);
        });

        $response = $this->withHeaders(parityToken($user))
            ->postJson('/api/v1/employer/interviews/bulk', [
                'application_ids' => $applications->pluck('id')->all(),
                'stage' => 'hr',
                'mode' => 'online',
                'title' => 'HR Screening',
                'start_at' => now()->addWeek()->toIso8601String(),
                'duration_minutes' => 30,
                'gap_minutes' => 15,
                'group_mode' => false,
            ])
            ->assertCreated();

        expect($response->json('meta.scheduled_count'))->toBe(3)
            ->and($response->json('meta.failed_count'))->toBe(0);
    });

    it('refuses application ids from another company', function (): void {
        [$mine] = parityEmployer();
        [, , $theirJob] = parityEmployer();

        $seeker = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $seeker->id]);
        $victim = Application::factory()->create(['job_id' => $theirJob->id, 'employee_profile_id' => $profile->id]);

        $this->withHeaders(parityToken($mine))
            ->postJson('/api/v1/employer/interviews/bulk', [
                'application_ids' => [$victim->id],
                'stage' => 'hr',
                'mode' => 'online',
                'title' => 'Hijacked',
                'start_at' => now()->addWeek()->toIso8601String(),
                'duration_minutes' => 30,
                'gap_minutes' => 0,
                'group_mode' => false,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('application_ids');
    });
});

describe('cv builder', function (): void {
    beforeEach(fn () => Storage::fake('public'));

    it('returns an empty draft before anything is built', function (): void {
        $user = User::factory()->employee()->create(['password' => 'password']);
        EmployeeProfile::factory()->create(['user_id' => $user->id, 'cv_builder_json' => null]);

        $this->withHeaders(parityToken($user))
            ->getJson('/api/v1/cv-builder')
            ->assertOk()
            ->assertJsonPath('data.draft', null);
    });

    it('builds a cv and stores it', function (): void {
        $user = User::factory()->employee()->create(['password' => 'password']);
        EmployeeProfile::factory()->create(['user_id' => $user->id]);

        $this->withHeaders(parityToken($user))
            ->postJson('/api/v1/cv-builder', [
                'label' => 'CV Saya',
                'personal' => ['full_name' => 'Budi Santoso', 'headline' => 'Flutter Engineer'],
            ])
            ->assertOk()
            ->assertJsonPath('data.label', 'CV Saya');

        $this->assertDatabaseHas('candidate_cvs', ['label' => 'CV Saya']);
    });

    it('blocks an employer from the cv builder', function (): void {
        $employer = User::factory()->employer()->create(['password' => 'password']);

        $this->withHeaders(parityToken($employer))->getJson('/api/v1/cv-builder')->assertStatus(403);
    });
});

describe('employer ai interview review', function (): void {
    it('lists only real sessions for this company, not practice', function (): void {
        [$user, , $job] = parityEmployer();
        $seeker = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $seeker->id]);

        AiInterviewSession::factory()->create([
            'job_id' => $job->id,
            'candidate_profile_id' => $profile->id,
            'is_practice' => false,
        ]);

        // A candidate's own rehearsal is not the employer's business.
        AiInterviewSession::factory()->create([
            'job_id' => $job->id,
            'candidate_profile_id' => $profile->id,
            'is_practice' => true,
        ]);

        $response = $this->withHeaders(parityToken($user))
            ->getJson('/api/v1/employer/ai-interviews')->assertOk();

        expect($response->json('data'))->toHaveCount(1);
    });

    it('403s a session from another company', function (): void {
        [$mine] = parityEmployer();
        [, , $theirJob] = parityEmployer();

        $seeker = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $seeker->id]);
        $session = AiInterviewSession::factory()->create([
            'job_id' => $theirJob->id,
            'candidate_profile_id' => $profile->id,
            'is_practice' => false,
        ]);

        $this->withHeaders(parityToken($mine))
            ->getJson('/api/v1/employer/ai-interviews/'.$session->id)
            ->assertStatus(403);
    });

    it('lists outreach sent by this company', function (): void {
        [$user] = parityEmployer();

        $this->withHeaders(parityToken($user))
            ->getJson('/api/v1/employer/outreach')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['total']]);
    });
});
