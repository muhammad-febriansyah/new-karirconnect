<?php

use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewResponse;
use App\Models\AiInterviewSession;
use App\Models\AiInterviewTemplate;
use App\Models\AiInterviewTemplateQuestion;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
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

function makeTemplateContext(): array
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    return compact('owner', 'company');
}

test('employer can add a question to own template', function () {
    ['owner' => $owner, 'company' => $company] = makeTemplateContext();
    $template = AiInterviewTemplate::factory()->create(['company_id' => $company->id]);

    $this->actingAs($owner)
        ->post(route('employer.ai-interview-templates.questions.store', ['template' => $template->id]), [
            'category' => 'technical',
            'question' => 'Ceritakan pengalaman membangun sistem real-time dengan WebSocket?',
            'context' => null,
            'expected_keywords' => ['websocket', 'broadcasting'],
            'max_duration_seconds' => 180,
        ])
        ->assertRedirect();

    expect($template->questions()->count())->toBe(1);
    $q = $template->questions()->first();
    expect($q->question)->toContain('WebSocket');
    expect($q->order_number)->toBe(1);
});

test('employer cannot add question to another company template', function () {
    ['owner' => $owner] = makeTemplateContext();
    $other = User::factory()->employer()->create();
    $otherCompany = Company::factory()->approved()->create(['owner_id' => $other->id]);
    $foreign = AiInterviewTemplate::factory()->create(['company_id' => $otherCompany->id]);

    $this->actingAs($owner)
        ->post(route('employer.ai-interview-templates.questions.store', ['template' => $foreign->id]), [
            'category' => 'technical',
            'question' => 'Should not be allowed?',
            'max_duration_seconds' => 120,
        ])
        ->assertForbidden();
});

test('employer can reorder template questions', function () {
    ['owner' => $owner, 'company' => $company] = makeTemplateContext();
    $template = AiInterviewTemplate::factory()->create(['company_id' => $company->id]);
    $q1 = AiInterviewTemplateQuestion::factory()->create(['template_id' => $template->id, 'order_number' => 1]);
    $q2 = AiInterviewTemplateQuestion::factory()->create(['template_id' => $template->id, 'order_number' => 2]);
    $q3 = AiInterviewTemplateQuestion::factory()->create(['template_id' => $template->id, 'order_number' => 3]);

    $this->actingAs($owner)
        ->post(route('employer.ai-interview-templates.questions.reorder', ['template' => $template->id]), [
            'order' => [$q3->id, $q1->id, $q2->id],
        ])
        ->assertRedirect();

    expect($q3->fresh()->order_number)->toBe(1);
    expect($q1->fresh()->order_number)->toBe(2);
    expect($q2->fresh()->order_number)->toBe(3);
});

test('question generator copies from template when template has questions', function () {
    ['company' => $company] = makeTemplateContext();
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'job_category_id' => $cat->id,
    ]);
    $candidateUser = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $candidateUser->id]);
    $template = AiInterviewTemplate::factory()->create(['company_id' => $company->id]);

    AiInterviewTemplateQuestion::factory()->create([
        'template_id' => $template->id,
        'order_number' => 1,
        'category' => 'opening',
        'question' => 'Pertanyaan pembuka kustom recruiter.',
    ]);
    AiInterviewTemplateQuestion::factory()->create([
        'template_id' => $template->id,
        'order_number' => 2,
        'category' => 'technical',
        'question' => 'Pertanyaan teknis kustom recruiter.',
    ]);

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
        'template_id' => $template->id,
    ]);

    app(AiQuestionGeneratorService::class)->generate($session->fresh());

    $session->refresh()->load('questions');
    expect($session->questions)->toHaveCount(2);
    expect($session->questions->pluck('question')->all())->toBe([
        'Pertanyaan pembuka kustom recruiter.',
        'Pertanyaan teknis kustom recruiter.',
    ]);
});

test('candidate can switch from voice to text before answering anything', function () {
    ['company' => $company] = makeTemplateContext();
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'job_category_id' => $cat->id,
    ]);
    $candidateUser = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $candidateUser->id]);

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
        'mode' => 'voice',
        'voice' => 'marin',
    ]);

    $this->actingAs($candidateUser)
        ->post(route('employee.ai-interviews.switch-to-text', ['session' => $session->id]))
        ->assertRedirect();

    $session->refresh();
    expect($session->mode?->value)->toBe('text');
    expect($session->voice)->toBeNull();
});

test('candidate cannot switch to text after answering questions', function () {
    ['company' => $company] = makeTemplateContext();
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'job_category_id' => $cat->id,
    ]);
    $candidateUser = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $candidateUser->id]);

    $session = AiInterviewSession::factory()->inProgress()->create([
        'candidate_profile_id' => $profile->id,
        'job_id' => $job->id,
        'mode' => 'voice',
        'voice' => 'marin',
    ]);

    // Seed an answer manually
    $question = AiInterviewQuestion::factory()->create([
        'session_id' => $session->id,
        'order_number' => 1,
    ]);
    AiInterviewResponse::factory()->create([
        'question_id' => $question->id,
        'answer_text' => 'Already answered',
    ]);

    $this->actingAs($candidateUser)
        ->post(route('employee.ai-interviews.switch-to-text', ['session' => $session->id]))
        ->assertSessionHas('error');

    expect($session->fresh()->mode?->value)->toBe('voice');
});
