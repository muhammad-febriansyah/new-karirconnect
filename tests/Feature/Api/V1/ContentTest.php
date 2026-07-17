<?php

use App\Models\AssessmentQuestion;
use App\Models\CareerResource;
use App\Models\EmployeeProfile;
use App\Models\Faq;
use App\Models\LegalPage;
use App\Models\Skill;
use App\Models\SkillAssessment;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class, ProvinceCitySeeder::class, LookupSeeder::class]);
});

function contentToken(User $user): array
{
    $token = test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()->json('data.tokens.access_token');

    return ['Authorization' => 'Bearer '.$token];
}

function assessmentSeeker(): User
{
    $user = User::factory()->employee()->create(['password' => 'password']);
    EmployeeProfile::factory()->create(['user_id' => $user->id]);

    return $user;
}

/**
 * A skill with one multiple-choice question whose answer is "B".
 */
function skillWithQuestion(): Skill
{
    $skill = Skill::factory()->create(['is_active' => true]);

    AssessmentQuestion::factory()->create([
        'skill_id' => $skill->id,
        'is_active' => true,
        'question' => 'Berapa 1 + 1?',
        'options' => ['A. 1', 'B. 2', 'C. 3'],
        'correct_answer' => ['value' => 'B. 2'],
    ]);

    return $skill;
}

describe('public content', function (): void {
    it('lists published faqs only', function (): void {
        Faq::factory()->create(['question' => 'Published Q', 'is_published' => true]);
        Faq::factory()->create(['question' => 'Draft Q', 'is_published' => false]);

        $questions = collect($this->getJson('/api/v1/faqs')->assertOk()->json('data'))->pluck('question');

        expect($questions)->toContain('Published Q')->not->toContain('Draft Q');
    });

    it('returns a legal page by slug', function (): void {
        LegalPage::factory()->create(['slug' => 'privacy', 'title' => 'Kebijakan Privasi']);

        $this->getJson('/api/v1/legal/privacy')
            ->assertOk()
            ->assertJsonPath('data.title', 'Kebijakan Privasi');
    });

    it('lists career resources and hides drafts', function (): void {
        CareerResource::factory()->create(['title' => 'Live Article', 'is_published' => true]);
        CareerResource::factory()->create(['title' => 'Draft Article', 'is_published' => false]);

        $titles = collect($this->getJson('/api/v1/career-resources')->assertOk()->json('data'))->pluck('title');

        expect($titles)->toContain('Live Article')->not->toContain('Draft Article');
    });

    it('404s an unpublished career resource', function (): void {
        $resource = CareerResource::factory()->create(['is_published' => false]);

        $this->getJson('/api/v1/career-resources/'.$resource->slug)->assertStatus(404);
    });

    it('accepts a contact message', function (): void {
        $this->postJson('/api/v1/contact', [
            'name' => 'Budi',
            'email' => 'budi@example.test',
            'subject' => 'Pertanyaan',
            'message' => 'Halo, saya ingin bertanya.',
        ])->assertCreated();

        $this->assertDatabaseHas('contact_messages', ['email' => 'budi@example.test', 'status' => 'new']);
    });

    it('validates the contact form', function (): void {
        $this->postJson('/api/v1/contact', ['name' => 'Budi'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'subject', 'message']);
    });

    it('serves content to guests', function (): void {
        $this->getJson('/api/v1/faqs')->assertOk();
        $this->getJson('/api/v1/career-resources')->assertOk();
    });
});

describe('skill assessments', function (): void {
    it('lists assessable skills', function (): void {
        skillWithQuestion();
        $user = assessmentSeeker();

        $this->withHeaders(contentToken($user))
            ->getJson('/api/v1/skill-assessments')
            ->assertOk()
            ->assertJsonStructure(['data' => ['skills', 'assessments']]);
    });

    it('starts an assessment', function (): void {
        $skill = skillWithQuestion();
        $user = assessmentSeeker();

        $this->withHeaders(contentToken($user))
            ->postJson('/api/v1/skill-assessments', ['skill_id' => $skill->id])
            ->assertCreated()
            ->assertJsonPath('data.status', 'in_progress');
    });

    it('resumes rather than starting a second assessment', function (): void {
        // Starting again must not reroll the question set.
        $skill = skillWithQuestion();
        $user = assessmentSeeker();
        $headers = contentToken($user);

        $first = $this->withHeaders($headers)
            ->postJson('/api/v1/skill-assessments', ['skill_id' => $skill->id])->assertCreated()->json('data.id');

        $second = $this->withHeaders($headers)
            ->postJson('/api/v1/skill-assessments', ['skill_id' => $skill->id])->assertCreated()->json('data.id');

        expect($second)->toBe($first);
        $this->assertDatabaseCount('skill_assessments', 1);
    });

    it('refuses a skill with no active questions', function (): void {
        $skill = Skill::factory()->create(['is_active' => true]);
        $user = assessmentSeeker();

        $this->withHeaders(contentToken($user))
            ->postJson('/api/v1/skill-assessments', ['skill_id' => $skill->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('skill_id');
    });

    it('does not reveal the answer key before submission', function (): void {
        $skill = skillWithQuestion();
        $user = assessmentSeeker();
        $headers = contentToken($user);

        $id = $this->withHeaders($headers)
            ->postJson('/api/v1/skill-assessments', ['skill_id' => $skill->id])->assertCreated()->json('data.id');

        $response = $this->withHeaders($headers)->getJson('/api/v1/skill-assessments/'.$id)->assertOk();

        expect($response->json('data.questions.0.correct_answer'))->toBeNull()
            ->and($response->json('data.questions.0.is_correct'))->toBeNull();
    });

    it('scores a submission', function (): void {
        $skill = skillWithQuestion();
        $user = assessmentSeeker();
        $headers = contentToken($user);

        $id = $this->withHeaders($headers)
            ->postJson('/api/v1/skill-assessments', ['skill_id' => $skill->id])->assertCreated()->json('data.id');

        $questionId = AssessmentQuestion::query()->where('skill_id', $skill->id)->value('id');

        $this->withHeaders($headers)
            ->postJson('/api/v1/skill-assessments/'.$id.'/submit', [
                'answers' => [(string) $questionId => ['value' => 'B. 2']],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.score', 100);
    });

    it('marks a wrong answer wrong', function (): void {
        $skill = skillWithQuestion();
        $user = assessmentSeeker();
        $headers = contentToken($user);

        $id = $this->withHeaders($headers)
            ->postJson('/api/v1/skill-assessments', ['skill_id' => $skill->id])->assertCreated()->json('data.id');

        $questionId = AssessmentQuestion::query()->where('skill_id', $skill->id)->value('id');

        $this->withHeaders($headers)
            ->postJson('/api/v1/skill-assessments/'.$id.'/submit', [
                'answers' => [(string) $questionId => ['value' => 'C. 3']],
            ])
            ->assertOk()
            ->assertJsonPath('data.score', 0);
    });

    it('matches an answer case-insensitively', function (): void {
        $skill = skillWithQuestion();
        $user = assessmentSeeker();
        $headers = contentToken($user);

        $id = $this->withHeaders($headers)
            ->postJson('/api/v1/skill-assessments', ['skill_id' => $skill->id])->assertCreated()->json('data.id');

        $questionId = AssessmentQuestion::query()->where('skill_id', $skill->id)->value('id');

        $this->withHeaders($headers)
            ->postJson('/api/v1/skill-assessments/'.$id.'/submit', [
                'answers' => [(string) $questionId => ['value' => '  b. 2  ']],
            ])
            ->assertOk()
            ->assertJsonPath('data.score', 100);
    });

    it('403s opening another candidate assessment', function (): void {
        $skill = skillWithQuestion();
        $mine = assessmentSeeker();
        $theirs = assessmentSeeker();

        $assessment = SkillAssessment::factory()->create([
            'employee_profile_id' => $theirs->employeeProfile->id,
            'skill_id' => $skill->id,
            'status' => 'in_progress',
            'total_questions' => 1,
        ]);

        $this->withHeaders(contentToken($mine))
            ->getJson('/api/v1/skill-assessments/'.$assessment->id)
            ->assertStatus(403);
    });
});
