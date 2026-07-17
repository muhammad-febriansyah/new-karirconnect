<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\StartSkillAssessmentRequest;
use App\Http\Requests\Employee\SubmitSkillAssessmentRequest;
use App\Models\AssessmentQuestion;
use App\Models\EmployeeProfile;
use App\Models\Skill;
use App\Models\SkillAssessment;
use App\Services\Employee\SkillAssessmentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SkillAssessmentController extends Controller
{
    public function __construct(private readonly SkillAssessmentService $assessments) {}

    public function index(Request $request): Response
    {
        $profile = $this->employeeProfile($request);

        return Inertia::render('employee/skill-assessments/index', [
            'skills' => Skill::query()
                ->where('is_active', true)
                ->whereHas('assessmentQuestions', fn ($query) => $query->where('is_active', true))
                ->orderBy('name')
                ->get()
                ->map(fn (Skill $skill): array => [
                    'id' => $skill->id,
                    'name' => $skill->name,
                    'category' => $skill->category,
                    'question_count' => $skill->assessmentQuestions()->where('is_active', true)->count(),
                ]),
            'assessments' => SkillAssessment::query()
                ->with('skill:id,name,category')
                ->where('employee_profile_id', $profile->id)
                ->latest('id')
                ->get()
                ->map(fn (SkillAssessment $assessment): array => [
                    'id' => $assessment->id,
                    'skill' => $assessment->skill?->name,
                    'category' => $assessment->skill?->category,
                    'status' => $assessment->status,
                    'score' => $assessment->score,
                    'total_questions' => $assessment->total_questions,
                    'correct_answers' => $assessment->correct_answers,
                    'started_at' => optional($assessment->started_at)->toIso8601String(),
                    'completed_at' => optional($assessment->completed_at)->toIso8601String(),
                    'expires_at' => optional($assessment->expires_at)->toIso8601String(),
                ]),
        ]);
    }

    public function store(StartSkillAssessmentRequest $request): RedirectResponse
    {
        // Shared with the mobile API via SkillAssessmentService, so both score
        // and resume assessments identically.
        $assessment = $this->assessments->start(
            $this->employeeProfile($request),
            Skill::query()->findOrFail($request->integer('skill_id')),
        );

        return to_route('employee.skill-assessments.show', $assessment);
    }

    public function show(Request $request, SkillAssessment $skillAssessment): Response
    {
        $this->ensureOwnership($request, $skillAssessment);

        $questions = $this->assessments->questionsFor($skillAssessment);
        $answers = $skillAssessment->answers()->get()->keyBy('question_id');
        $isCompleted = $skillAssessment->status === 'completed';

        return Inertia::render('employee/skill-assessments/take', [
            'assessment' => [
                'id' => $skillAssessment->id,
                'status' => $skillAssessment->status,
                'score' => $skillAssessment->score,
                'skill' => $skillAssessment->skill?->only(['id', 'name', 'category']),
                'total_questions' => $skillAssessment->total_questions,
                'correct_answers' => $skillAssessment->correct_answers,
                'started_at' => optional($skillAssessment->started_at)->toIso8601String(),
                'completed_at' => optional($skillAssessment->completed_at)->toIso8601String(),
                'expires_at' => optional($skillAssessment->expires_at)->toIso8601String(),
                'duration_seconds' => $skillAssessment->started_at && $skillAssessment->completed_at
                    ? $skillAssessment->started_at->diffInSeconds($skillAssessment->completed_at)
                    : null,
                'questions' => $questions->map(function (AssessmentQuestion $question) use ($answers, $isCompleted): array {
                    $answer = $answers->get($question->id);
                    $expected = $this->assessments->expectedValues($question);

                    return [
                        'id' => $question->id,
                        'type' => $question->type,
                        'question' => $question->question,
                        'options' => $question->options ?? [],
                        'difficulty' => $question->difficulty,
                        'time_limit_seconds' => $question->time_limit_seconds,
                        'answer' => $answer?->answer['value'] ?? '',
                        'time_spent_seconds' => $answer?->time_spent_seconds,
                        'is_correct' => $isCompleted ? (bool) ($answer?->is_correct ?? false) : null,
                        'correct_answer' => $isCompleted ? ($expected[0] ?? null) : null,
                    ];
                })->all(),
            ],
        ]);
    }

    public function submit(SubmitSkillAssessmentRequest $request, SkillAssessment $skillAssessment): RedirectResponse
    {
        $this->ensureOwnership($request, $skillAssessment);

        $this->assessments->submit($skillAssessment, $request->validated('answers'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Assessment berhasil dikirim.']);

        return to_route('employee.skill-assessments.show', $skillAssessment);
    }

    private function employeeProfile(Request $request): EmployeeProfile
    {
        return EmployeeProfile::query()->firstOrCreate(
            ['user_id' => $request->user()->id],
            ['profile_completion' => 0, 'visibility' => 'public'],
        );
    }

    private function ensureOwnership(Request $request, SkillAssessment $skillAssessment): void
    {
        $profile = $this->employeeProfile($request);

        abort_unless($skillAssessment->employee_profile_id === $profile->id, 403);
    }
}
