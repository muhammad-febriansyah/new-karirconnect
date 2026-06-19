<?php

use App\Jobs\FinalizeAiInterviewJob;
use App\Models\AiAuditLog;
use App\Models\AiCoachSession;
use App\Models\AiInterviewQuestion;
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
use App\Services\Ai\Contracts\AiClient;
use App\Services\Ai\Contracts\AiResponse;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Queue;

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
    expect($response->sub_scores)->toBeArray()->toHaveKeys(['technical', 'communication', 'problem_solving', 'culture_fit']);
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

test('practice session blocked when monthly free quota exhausted', function () {
    ['candidate' => $candidate, 'profile' => $profile] = makeAiInterviewContext();

    AiInterviewSession::factory()->count(10)->create([
        'candidate_profile_id' => $profile->id,
        'is_practice' => true,
        'created_at' => now()->startOfMonth()->addDay(),
    ]);

    $this->actingAs($candidate)
        ->post(route('employee.ai-interviews.practice'))
        ->assertSessionHasErrors('quota');

    expect(AiInterviewSession::query()->where('candidate_profile_id', $profile->id)->where('is_practice', true)->count())
        ->toBe(10);
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

test('candidate result page hides analysis & scores for non-practice sessions', function () {
    ['candidate' => $candidate, 'profile' => $profile, 'job' => $job] = makeAiInterviewContext();

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
        'is_practice' => false,
    ]);
    app(AiQuestionGeneratorService::class)->generate($session);
    app(AiInterviewAnalysisService::class)->analyze($session->fresh());

    $response = $this->actingAs($candidate)
        ->get(route('employee.ai-interviews.result', ['session' => $session->id]))
        ->assertOk();

    $page = $response->viewData('page');
    expect($page['props']['analysis'])->toBeNull();
    foreach ($page['props']['responses'] as $r) {
        expect($r['ai_score'])->toBeNull();
        expect($r['sub_scores'])->toBeNull();
        expect($r['ai_feedback'])->toBeNull();
    }
});

test('candidate result page still shows analysis on practice sessions', function () {
    ['candidate' => $candidate, 'profile' => $profile, 'job' => $job] = makeAiInterviewContext();

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
        'is_practice' => true,
    ]);
    app(AiQuestionGeneratorService::class)->generate($session);
    app(AiInterviewAnalysisService::class)->analyze($session->fresh());

    $response = $this->actingAs($candidate)
        ->get(route('employee.ai-interviews.result', ['session' => $session->id]))
        ->assertOk();

    $page = $response->viewData('page');
    expect($page['props']['analysis'])->not->toBeNull();
    expect($page['props']['analysis']['overall_score'])->toBeInt();
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

test('answer endpoint defers scoring (no inline AI call)', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();
    $candidate = $profile->user;

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
        'is_practice' => true,
    ]);
    app(AiQuestionGeneratorService::class)->generate($session);
    $question = $session->questions()->first();

    $this->actingAs($candidate)
        ->post(route('employee.ai-interviews.answer', ['session' => $session->id, 'question' => $question->id]), [
            'answer' => 'Jawaban kandidat yang relevan dan terstruktur.',
        ])
        ->assertRedirect();

    $response = $question->fresh()->response;
    expect($response)->not->toBeNull();
    expect($response->answer_text)->not->toBeNull();
    // Scoring is deferred to the finalize job, so no score yet.
    expect($response->ai_score)->toBeNull();
    expect($response->evaluated_at)->toBeNull();
});

test('completing an interview queues the finalize job', function () {
    Queue::fake();

    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();
    $candidate = $profile->user;

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
        'is_practice' => true,
        'started_at' => now()->subMinutes(5),
    ]);
    app(AiQuestionGeneratorService::class)->generate($session);

    $this->actingAs($candidate)
        ->post(route('employee.ai-interviews.complete', ['session' => $session->id]))
        ->assertRedirect();

    Queue::assertPushed(FinalizeAiInterviewJob::class);
    expect($session->fresh()->status?->value)->toBe('analyzing');
});

test('analysis falls back to needs_review when the model returns invalid output', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();

    // Bind a client that always returns non-JSON so retries are exhausted.
    app()->instance('ai.client', new class implements AiClient
    {
        public function chat(array $messages, array $options = []): AiResponse
        {
            return new AiResponse(content: 'totally not json');
        }

        public function provider(): string
        {
            return 'fake-broken';
        }

        public function model(): string
        {
            return 'fake-broken-1';
        }
    });

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
    ]);
    AiInterviewQuestion::factory()->create(['session_id' => $session->id, 'order_number' => 1]);

    $analysis = app(AiInterviewAnalysisService::class)->analyze($session->fresh());

    expect($analysis->status)->toBe('needs_review');
    expect($analysis->overall_score)->toBeNull();
    expect($analysis->recommendation)->toBeNull();
    expect($session->fresh()->status?->value)->toBe('completed');
});

test('evaluator flags answer for manual review when the model fails', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();

    app()->instance('ai.client', new class implements AiClient
    {
        public function chat(array $messages, array $options = []): AiResponse
        {
            return new AiResponse(content: 'nope');
        }

        public function provider(): string
        {
            return 'fake-broken';
        }

        public function model(): string
        {
            return 'fake-broken-1';
        }
    });

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
    ]);
    $question = AiInterviewQuestion::factory()->create(['session_id' => $session->id, 'order_number' => 1]);

    $response = app(AiAnswerEvaluatorService::class)->evaluate($session, $question, 'Jawaban saya.');

    expect($response->ai_score)->toBeNull();
    expect($response->evaluated_at)->not->toBeNull();
    expect($response->ai_feedback)->toContain('tinjauan manual');
});

test('answer endpoint persists integrity signals (paste / tab-switch)', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();
    $candidate = $profile->user;

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
        'is_practice' => true,
    ]);
    app(AiQuestionGeneratorService::class)->generate($session);
    $question = $session->questions()->first();

    $this->actingAs($candidate)
        ->post(route('employee.ai-interviews.answer', ['session' => $session->id, 'question' => $question->id]), [
            'answer' => 'Jawaban kandidat.',
            'paste_count' => 2,
            'focus_loss_count' => 3,
        ])
        ->assertRedirect();

    $response = $question->fresh()->response;
    expect($response->paste_count)->toBe(2);
    expect($response->focus_loss_count)->toBe(3);
});

test('analysis radar is grounded in per-answer sub-scores', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
    ]);
    app(AiQuestionGeneratorService::class)->generate($session);

    // Score one answer so its sub-scores feed the radar average.
    $question = $session->questions()->first();
    app(AiAnswerEvaluatorService::class)->evaluate($session->fresh(), $question, 'Jawaban lengkap.', 60);

    $analysis = app(AiInterviewAnalysisService::class)->analyze($session->fresh());

    // FakeAiClient evaluation fixture: communication=75, technical=70.
    expect($analysis->communication_score)->toBe(75);
    expect($analysis->technical_score)->toBe(70);
});

test('final analysis runs on the configured analysis model', function () {
    ['profile' => $profile, 'job' => $job] = makeAiInterviewContext();

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
    ]);
    AiInterviewQuestion::factory()->create(['session_id' => $session->id, 'order_number' => 1]);

    app(AiInterviewAnalysisService::class)->analyze($session->fresh());

    $log = AiAuditLog::query()->where('feature', 'ai_interview')->latest('id')->first();
    expect($log->model)->toBe('gpt-4o');
});
