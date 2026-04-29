<?php

use App\Models\AiAuditLog;
use App\Models\AiCoachSession;
use App\Models\AiInterviewSession;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
use App\Services\Ai\AiAnswerEvaluatorService;
use App\Services\Ai\AiCareerCoachService;
use App\Services\Ai\AiInterviewAnalysisService;
use App\Services\Ai\AiQuestionGeneratorService;
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

function makeAiInterviewContext(): array
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);
    $candidate = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $candidate->id]);

    return compact('owner', 'company', 'job', 'candidate', 'profile');
}

test('question generator populates session with fixture questions', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
    ]);

    app(AiQuestionGeneratorService::class)->generate($session);

    expect($session->questions()->count())->toBeGreaterThan(0);
    expect($session->fresh()->ai_provider)->toBe('fake');
    expect($session->fresh()->system_prompt_snapshot)->not->toBeNull();
});

test('question generator is idempotent on subsequent calls', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
    ]);

    app(AiQuestionGeneratorService::class)->generate($session);
    $firstCount = $session->questions()->count();

    app(AiQuestionGeneratorService::class)->generate($session->fresh());

    expect($session->questions()->count())->toBe($firstCount);
});

test('answer evaluator persists ai_score and sub_scores', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
    ]);
    app(AiQuestionGeneratorService::class)->generate($session);
    $question = $session->questions()->first();

    $response = app(AiAnswerEvaluatorService::class)->evaluate(
        $session->fresh(),
        $question,
        'Saya memiliki pengalaman 5 tahun membangun aplikasi Laravel berskala besar dengan fokus pada arsitektur modular dan caching.',
        180,
    );

    expect($response->ai_score)->toBe(72);
    expect($response->sub_scores)->toBeArray()->toHaveKey('relevance');
    expect($response->ai_feedback)->not->toBeEmpty();
    expect($response->duration_seconds)->toBe(180);
});

test('analysis service marks session completed and stores scorecard', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
    ]);
    app(AiQuestionGeneratorService::class)->generate($session);

    $analysis = app(AiInterviewAnalysisService::class)->analyze($session->fresh());

    expect($analysis->overall_score)->toBe(76);
    expect($analysis->recommendation)->toBe('hire');
    expect($analysis->strengths)->toBeArray();
    expect($session->fresh()->status?->value)->toBe('completed');
});

test('career coach reply persists user and assistant messages with history', function () {
    ['candidate' => $candidate] = makeAiInterviewContext();

    $session = AiCoachSession::factory()->create(['user_id' => $candidate->id]);

    app(AiCareerCoachService::class)->reply($session, $candidate, 'Bagaimana cara persiapan interview backend engineer?');

    $messages = $session->messages()->orderBy('id')->get();
    expect($messages)->toHaveCount(2);
    expect($messages[0]->role)->toBe('user');
    expect($messages[1]->role)->toBe('assistant');
    expect($messages[1]->content)->not->toBeEmpty();
    expect($messages[1]->tokens_used)->toBeGreaterThan(0);
});

test('every ai client call writes an audit log entry', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();
    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
    ]);

    expect(AiAuditLog::query()->count())->toBe(0);

    app(AiQuestionGeneratorService::class)->generate($session);

    $logs = AiAuditLog::query()->get();
    expect($logs)->toHaveCount(1);
    expect($logs->first()->status)->toBe('success');
    expect($logs->first()->feature)->toBe('ai_interview');
    expect($logs->first()->prompt_tokens)->toBeGreaterThan(0);
});

test('employee can run practice session end-to-end via controller', function () {
    ['candidate' => $candidate] = makeAiInterviewContext();

    $this->actingAs($candidate)
        ->post(route('employee.ai-interviews.practice'))
        ->assertRedirect();

    $session = AiInterviewSession::query()->latest('id')->first();
    expect($session)->not->toBeNull();
    expect($session->is_practice)->toBeTrue();
    expect($session->questions()->count())->toBeGreaterThan(0);

    $question = $session->questions()->first();
    $this->actingAs($candidate)
        ->post(route('employee.ai-interviews.answer', [
            'session' => $session->id,
            'question' => $question->id,
        ]), [
            'answer' => 'Jawaban saya adalah dengan pendekatan iteratif berbasis data.',
            'duration_seconds' => 90,
        ])
        ->assertRedirect();

    expect($question->fresh()->response)->not->toBeNull();

    $this->actingAs($candidate)
        ->post(route('employee.ai-interviews.complete', ['session' => $session->id]))
        ->assertRedirect();

    expect($session->fresh()->status?->value)->toBe('completed');
    expect($session->fresh()->analysis)->not->toBeNull();
});

test('employee cannot view another candidate ai interview session', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();
    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
    ]);

    $intruder = User::factory()->employee()->create();
    EmployeeProfile::factory()->create(['user_id' => $intruder->id]);

    $this->actingAs($intruder)
        ->get(route('employee.ai-interviews.run', ['session' => $session->id]))
        ->assertForbidden();
});

test('employer can review own-company ai interview analysis', function () {
    ['owner' => $owner, 'profile' => $profile, 'job' => $job] = makeAiInterviewContext();

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
    ]);
    app(AiQuestionGeneratorService::class)->generate($session);
    app(AiInterviewAnalysisService::class)->analyze($session->fresh());

    $this->actingAs($owner)
        ->get(route('employer.ai-interviews.show', ['session' => $session->id]))
        ->assertOk();
});

test('employer cannot review another company ai interview session', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
    ]);
    app(AiQuestionGeneratorService::class)->generate($session);
    app(AiInterviewAnalysisService::class)->analyze($session->fresh());

    $otherEmployer = User::factory()->employer()->create();
    Company::factory()->approved()->create(['owner_id' => $otherEmployer->id]);

    $this->actingAs($otherEmployer)
        ->get(route('employer.ai-interviews.show', ['session' => $session->id]))
        ->assertForbidden();
});

test('career coach send endpoint stores a turn and updates last_message_at', function () {
    ['candidate' => $candidate] = makeAiInterviewContext();

    $session = AiCoachSession::factory()->create([
        'user_id' => $candidate->id,
        'last_message_at' => now()->subDay(),
    ]);
    $before = $session->last_message_at;

    $this->actingAs($candidate)
        ->post(route('employee.career-coach.send', ['session' => $session->id]), [
            'message' => 'Saya butuh saran negosiasi gaji.',
        ])
        ->assertRedirect();

    expect($session->messages()->count())->toBe(2);
    expect($session->fresh()->last_message_at->greaterThan($before))->toBeTrue();
});

test('user cannot send to another user coach session', function () {
    ['candidate' => $candidate] = makeAiInterviewContext();
    $session = AiCoachSession::factory()->create(['user_id' => $candidate->id]);

    $intruder = User::factory()->employee()->create();

    $this->actingAs($intruder)
        ->post(route('employee.career-coach.send', ['session' => $session->id]), [
            'message' => 'Hi',
        ])
        ->assertForbidden();
});
