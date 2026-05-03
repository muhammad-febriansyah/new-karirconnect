<?php

use App\Models\AssessmentQuestion;
use App\Models\EmployeeProfile;
use App\Models\Skill;
use App\Models\SkillAssessment;
use App\Models\SkillAssessmentAnswer;
use App\Models\User;
use App\Services\Ai\Clients\FakeAiClient;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can manage assessment questions', function () {
    $admin = User::factory()->admin()->create(['email_verified_at' => now()]);
    $skill = Skill::factory()->create(['name' => 'Laravel', 'is_active' => true]);

    $this->actingAs($admin)
        ->get(route('admin.assessment-questions.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/assessment-questions/index'));

    $this->actingAs($admin)
        ->get(route('admin.assessment-questions.skill', $skill))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/assessment-questions/index')
            ->where('selectedSkill.id', $skill->id)
        );

    $this->actingAs($admin)
        ->post(route('admin.assessment-questions.store'), [
            'skill_id' => $skill->id,
            'type' => 'multiple_choice',
            'question' => 'Framework PHP manakah yang dipakai project ini?',
            'options' => ['Symfony', 'Laravel', 'CodeIgniter'],
            'correct_answer' => ['value' => 'Laravel'],
            'difficulty' => 'easy',
            'time_limit_seconds' => 120,
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.assessment-questions.skill', $skill));

    $question = AssessmentQuestion::query()->firstOrFail();

    expect($question->correct_answer['value'])->toBe('Laravel');

    $this->actingAs($admin)
        ->put(route('admin.assessment-questions.update', $question), [
            'skill_id' => $skill->id,
            'type' => 'text',
            'question' => 'Jelaskan kegunaan service container di Laravel.',
            'options' => [],
            'correct_answer' => ['value' => 'Dependency injection'],
            'difficulty' => 'medium',
            'time_limit_seconds' => 240,
            'is_active' => false,
        ])
        ->assertRedirect(route('admin.assessment-questions.skill', $skill));

    $question->refresh();

    expect($question->type)->toBe('text')
        ->and($question->is_active)->toBeFalse();

    $this->actingAs($admin)
        ->delete(route('admin.assessment-questions.destroy', $question))
        ->assertRedirect(route('admin.assessment-questions.skill', $skill));

    $this->assertDatabaseMissing('assessment_questions', ['id' => $question->id]);
});

test('assessment questions only allow multiple choice and text types', function () {
    $admin = User::factory()->admin()->create(['email_verified_at' => now()]);
    $skill = Skill::factory()->create(['name' => 'Laravel', 'is_active' => true]);

    $this->actingAs($admin)
        ->post(route('admin.assessment-questions.store'), [
            'skill_id' => $skill->id,
            'type' => 'code',
            'question' => 'Tulis kode Laravel sederhana.',
            'options' => [],
            'correct_answer' => ['value' => 'php artisan'],
            'difficulty' => 'medium',
            'time_limit_seconds' => 120,
            'is_active' => true,
        ])
        ->assertSessionHasErrors('type');
});

test('admin can generate multiple assessment questions with ai', function () {
    app()->instance('ai.client', new FakeAiClient);

    $admin = User::factory()->admin()->create(['email_verified_at' => now()]);
    $skill = Skill::factory()->create(['name' => 'Laravel', 'is_active' => true]);

    $this->actingAs($admin)
        ->post(route('admin.assessment-questions.generate'), [
            'skill_id' => $skill->id,
            'type' => 'multiple_choice',
            'difficulty' => 'medium',
            'count' => 3,
            'topic' => 'routing dan middleware',
            'time_limit_seconds' => 180,
        ])
        ->assertRedirect(route('admin.assessment-questions.skill', $skill));

    expect(AssessmentQuestion::query()->where('skill_id', $skill->id)->count())->toBe(3);

    $question = AssessmentQuestion::query()->where('skill_id', $skill->id)->firstOrFail();

    expect($question->type)->toBe('multiple_choice')
        ->and($question->options)->toHaveCount(4)
        ->and($question->correct_answer['value'])->toBe('Konsep A');
});

test('employee can start and submit a skill assessment', function () {
    $employee = User::factory()->employee()->create(['email_verified_at' => now()]);
    $profile = EmployeeProfile::factory()->for($employee)->create();
    $skill = Skill::factory()->create(['name' => 'Laravel', 'is_active' => true]);

    AssessmentQuestion::factory()->count(3)->create([
        'skill_id' => $skill->id,
        'type' => 'multiple_choice',
        'options' => ['Laravel', 'React', 'Docker'],
        'correct_answer' => ['value' => 'Laravel'],
        'is_active' => true,
    ]);

    $this->actingAs($employee)
        ->get(route('employee.skill-assessments.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('employee/skill-assessments/index'));

    $response = $this->actingAs($employee)
        ->post(route('employee.skill-assessments.store'), [
            'skill_id' => $skill->id,
        ]);

    $assessment = SkillAssessment::query()->firstOrFail();

    expect($assessment->employee_profile_id)->toBe($profile->id)
        ->and($assessment->status)->toBe('in_progress');

    $response->assertRedirect(route('employee.skill-assessments.show', $assessment));

    $questions = AssessmentQuestion::query()->where('skill_id', $skill->id)->orderBy('id')->get();

    $this->actingAs($employee)
        ->post(route('employee.skill-assessments.submit', $assessment), [
            'answers' => $questions->mapWithKeys(fn (AssessmentQuestion $question, int $index) => [
                (string) $question->id => [
                    'value' => $index === 0 ? 'React' : 'Laravel',
                    'time_spent_seconds' => 30,
                ],
            ])->all(),
        ])
        ->assertRedirect(route('employee.skill-assessments.show', $assessment));

    $assessment->refresh();

    expect($assessment->status)->toBe('completed')
        ->and($assessment->correct_answers)->toBe(2)
        ->and($assessment->score)->toBe(67);

    expect(SkillAssessmentAnswer::query()->where('assessment_id', $assessment->id)->count())->toBe(3);
});
