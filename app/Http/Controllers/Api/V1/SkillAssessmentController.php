<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\StartSkillAssessmentRequest;
use App\Http\Requests\Employee\SubmitSkillAssessmentRequest;
use App\Models\AssessmentQuestion;
use App\Models\Skill;
use App\Models\SkillAssessment;
use App\Services\Employee\EmployeeProfileService;
use App\Services\Employee\SkillAssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SkillAssessmentController extends Controller
{
    public function __construct(
        private readonly SkillAssessmentService $assessments,
        private readonly EmployeeProfileService $profiles,
    ) {}

    /**
     * Skills that can be assessed, plus this candidate's past attempts.
     */
    public function index(Request $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $skills = Skill::query()
            ->where('is_active', true)
            ->whereHas('assessmentQuestions', fn ($query) => $query->where('is_active', true))
            ->withCount(['assessmentQuestions as question_count' => fn ($query) => $query->where('is_active', true)])
            ->orderBy('name')
            ->get()
            ->map(fn (Skill $skill) => [
                'id' => $skill->id,
                'name' => $skill->name,
                'category' => $skill->category,
                'question_count' => $skill->question_count,
            ]);

        $attempts = SkillAssessment::query()
            ->with('skill:id,name,category')
            ->where('employee_profile_id', $profile->id)
            ->latest('id')
            ->get()
            ->map(fn (SkillAssessment $assessment) => $this->present($assessment));

        return response()->json(['data' => ['skills' => $skills, 'assessments' => $attempts]]);
    }

    /**
     * Start an assessment. Resumes an in-progress one rather than starting
     * over, so the question set cannot be rerolled.
     */
    public function store(StartSkillAssessmentRequest $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $assessment = $this->assessments->start(
            $profile,
            Skill::query()->findOrFail($request->integer('skill_id')),
        );

        return response()->json(['data' => $this->present($assessment->load('skill'))], 201);
    }

    /**
     * The assessment with its questions.
     */
    public function show(Request $request, SkillAssessment $skillAssessment): JsonResponse
    {
        $this->authorizeOwn($request, $skillAssessment);

        $questions = $this->assessments->questionsFor($skillAssessment);
        $answers = $skillAssessment->answers()->get()->keyBy('question_id');
        $completed = $skillAssessment->status === 'completed';

        return response()->json([
            'data' => [
                ...$this->present($skillAssessment->load('skill')),
                'questions' => $questions->map(function (AssessmentQuestion $question) use ($answers, $completed) {
                    $answer = $answers->get($question->id);

                    return [
                        'id' => $question->id,
                        'type' => $question->type,
                        'question' => $question->question,
                        'options' => $question->options ?? [],
                        'difficulty' => $question->difficulty,
                        'time_limit_seconds' => $question->time_limit_seconds,
                        'answer' => $answer?->answer['value'] ?? '',

                        // Correctness and the expected answer are withheld until
                        // the assessment is submitted; sending them with the
                        // questions would hand the candidate the answer key.
                        'is_correct' => $completed ? (bool) ($answer?->is_correct ?? false) : null,
                        'correct_answer' => $completed
                            ? ($this->assessments->expectedValues($question)[0] ?? null)
                            : null,
                    ];
                })->values(),
            ],
        ]);
    }

    public function submit(SubmitSkillAssessmentRequest $request, SkillAssessment $skillAssessment): JsonResponse
    {
        $this->authorizeOwn($request, $skillAssessment);

        $assessment = $this->assessments->submit($skillAssessment, $request->validated('answers'));

        return response()->json(['data' => $this->present($assessment->load('skill'))]);
    }

    private function authorizeOwn(Request $request, SkillAssessment $assessment): void
    {
        $profile = $this->profiles->ensureProfile($request->user());

        abort_unless($assessment->employee_profile_id === $profile->id, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(SkillAssessment $assessment): array
    {
        return [
            'id' => $assessment->id,
            'skill' => $assessment->skill?->name,
            'skill_id' => $assessment->skill_id,
            'status' => $assessment->status,
            'score' => $assessment->score,
            'total_questions' => $assessment->total_questions,
            'correct_answers' => $assessment->correct_answers,
            'started_at' => $assessment->started_at?->toIso8601String(),
            'completed_at' => $assessment->completed_at?->toIso8601String(),
            'expires_at' => $assessment->expires_at?->toIso8601String(),
        ];
    }
}
