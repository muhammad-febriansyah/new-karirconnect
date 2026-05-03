<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\StartSkillAssessmentRequest;
use App\Http\Requests\Employee\SubmitSkillAssessmentRequest;
use App\Models\AssessmentQuestion;
use App\Models\EmployeeProfile;
use App\Models\Skill;
use App\Models\SkillAssessment;
use App\Models\SkillAssessmentAnswer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SkillAssessmentController extends Controller
{
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
        $skill = Skill::query()->findOrFail($request->integer('skill_id'));
        $profile = $this->employeeProfile($request);

        $questionCount = AssessmentQuestion::query()
            ->where('skill_id', $skill->id)
            ->where('is_active', true)
            ->count();

        if ($questionCount === 0) {
            throw ValidationException::withMessages([
                'skill_id' => 'Belum ada soal aktif untuk skill ini.',
            ]);
        }

        $activeAssessment = SkillAssessment::query()
            ->where('employee_profile_id', $profile->id)
            ->where('skill_id', $skill->id)
            ->where('status', 'in_progress')
            ->where(function ($query): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->latest('id')
            ->first();

        if ($activeAssessment) {
            return to_route('employee.skill-assessments.show', $activeAssessment);
        }

        $assessment = SkillAssessment::query()->create([
            'employee_profile_id' => $profile->id,
            'skill_id' => $skill->id,
            'status' => 'in_progress',
            'total_questions' => min(5, $questionCount),
            'correct_answers' => 0,
            'started_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        return to_route('employee.skill-assessments.show', $assessment);
    }

    public function show(Request $request, SkillAssessment $skillAssessment): Response
    {
        $this->ensureOwnership($request, $skillAssessment);

        $questions = $this->questionsForAssessment($skillAssessment);
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
                    $expected = $this->expectedAnswerValues($question);

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

        if ($skillAssessment->status === 'completed') {
            return to_route('employee.skill-assessments.show', $skillAssessment);
        }

        if ($skillAssessment->expires_at instanceof Carbon && $skillAssessment->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'answers' => 'Waktu assessment ini sudah habis.',
            ]);
        }

        $questions = $this->questionsForAssessment($skillAssessment);
        $answerPayloads = collect($request->validated('answers'));

        $correctAnswers = 0;

        foreach ($questions as $question) {
            $payload = $answerPayloads->get((string) $question->id, []);
            $normalizedAnswer = ['value' => trim((string) data_get($payload, 'value', ''))];
            $isCorrect = $this->answersMatch($question, $normalizedAnswer);

            SkillAssessmentAnswer::query()->updateOrCreate(
                [
                    'assessment_id' => $skillAssessment->id,
                    'question_id' => $question->id,
                ],
                [
                    'answer' => $normalizedAnswer,
                    'is_correct' => $isCorrect,
                    'time_spent_seconds' => data_get($payload, 'time_spent_seconds'),
                    'created_at' => now(),
                ],
            );

            if ($isCorrect) {
                $correctAnswers++;
            }
        }

        $totalQuestions = max($questions->count(), 1);

        $skillAssessment->update([
            'status' => 'completed',
            'correct_answers' => $correctAnswers,
            'total_questions' => $questions->count(),
            'score' => (int) round(($correctAnswers / $totalQuestions) * 100),
            'completed_at' => now(),
        ]);

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

    /**
     * @return Collection<int, AssessmentQuestion>
     */
    private function questionsForAssessment(SkillAssessment $skillAssessment)
    {
        return AssessmentQuestion::query()
            ->where('skill_id', $skillAssessment->skill_id)
            ->where('is_active', true)
            ->orderBy('id')
            ->limit($skillAssessment->total_questions)
            ->get();
    }

    private function answersMatch(AssessmentQuestion $question, array $answer): bool
    {
        $actual = str(trim((string) data_get($answer, 'value', '')))->lower()->value();

        if ($actual === '') {
            return false;
        }

        foreach ($this->expectedAnswerValues($question) as $expected) {
            $normalized = str(trim((string) $expected))->lower()->value();
            if ($normalized !== '' && $normalized === $actual) {
                return true;
            }
        }

        return false;
    }

    /**
     * Normalize various stored shapes of correct_answer into a flat list of
     * accepted strings. Supports legacy ["A. Pilihan A"] arrays and the
     * newer {"value": "..."} object form.
     *
     * @return list<string>
     */
    private function expectedAnswerValues(AssessmentQuestion $question): array
    {
        $raw = $question->correct_answer;

        if ($raw === null) {
            return [];
        }

        if (is_string($raw)) {
            return [$raw];
        }

        if (is_array($raw)) {
            if (array_key_exists('value', $raw)) {
                $value = $raw['value'];

                return is_array($value) ? array_map('strval', $value) : [(string) $value];
            }

            return array_values(array_map('strval', $raw));
        }

        return [];
    }
}
