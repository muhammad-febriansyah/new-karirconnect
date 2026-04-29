<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewSession;
use App\Services\Ai\AiAnswerEvaluatorService;
use App\Services\Ai\AiInterviewAnalysisService;
use App\Services\Ai\AiQuestionGeneratorService;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiInterviewController extends Controller
{
    public function __construct(
        private readonly EmployeeProfileService $profiles,
        private readonly AiQuestionGeneratorService $questions,
        private readonly AiAnswerEvaluatorService $evaluator,
        private readonly AiInterviewAnalysisService $analyzer,
    ) {}

    public function index(Request $request): Response
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $sessions = AiInterviewSession::query()
            ->with(['job:id,title,slug', 'analysis:id,session_id,overall_score,recommendation'])
            ->where('candidate_profile_id', $profile->id)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (AiInterviewSession $s) => [
                'id' => $s->id,
                'status' => $s->status?->value,
                'mode' => $s->mode?->value,
                'is_practice' => $s->is_practice,
                'started_at' => optional($s->started_at)->toIso8601String(),
                'completed_at' => optional($s->completed_at)->toIso8601String(),
                'job' => [
                    'title' => $s->job?->title,
                    'slug' => $s->job?->slug,
                ],
                'analysis' => $s->analysis ? [
                    'overall_score' => $s->analysis->overall_score,
                    'recommendation' => $s->analysis->recommendation,
                ] : null,
            ]);

        return Inertia::render('employee/ai-interviews/index', [
            'sessions' => $sessions,
        ]);
    }

    public function startPractice(Request $request): RedirectResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $session = AiInterviewSession::query()->create([
            'candidate_profile_id' => $profile->id,
            'mode' => 'text',
            'language' => 'id',
            'status' => 'in_progress',
            'started_at' => now(),
            'is_practice' => true,
        ]);

        $this->questions->generate($session);

        return redirect()->route('employee.ai-interviews.run', ['session' => $session->id]);
    }

    public function run(Request $request, AiInterviewSession $session): Response
    {
        $this->authorizeOwn($request, $session);

        $session->load(['questions.response', 'job:id,title']);

        if ($session->status?->value === 'pending' || ! $session->questions()->exists()) {
            $this->questions->generate($session);
            $session->forceFill(['status' => 'in_progress', 'started_at' => $session->started_at ?? now()])->save();
            $session->load(['questions.response']);
        }

        $currentIndex = $session->questions->search(fn ($q) => $q->response === null);
        $currentIndex = $currentIndex === false ? $session->questions->count() : $currentIndex;

        return Inertia::render('employee/ai-interviews/run', [
            'session' => [
                'id' => $session->id,
                'status' => $session->status?->value,
                'job_title' => $session->job?->title,
                'is_practice' => $session->is_practice,
                'total_questions' => $session->questions->count(),
                'current_index' => $currentIndex,
            ],
            'questions' => $session->questions->map(fn ($q) => [
                'id' => $q->id,
                'order_number' => $q->order_number,
                'category' => $q->category,
                'question' => $q->question,
                'max_duration_seconds' => $q->max_duration_seconds,
                'answered' => $q->response !== null,
            ])->values(),
            'currentQuestion' => $currentIndex < $session->questions->count() ? [
                'id' => $session->questions[$currentIndex]->id,
                'order_number' => $session->questions[$currentIndex]->order_number,
                'category' => $session->questions[$currentIndex]->category,
                'question' => $session->questions[$currentIndex]->question,
                'max_duration_seconds' => $session->questions[$currentIndex]->max_duration_seconds,
            ] : null,
        ]);
    }

    public function answer(Request $request, AiInterviewSession $session, AiInterviewQuestion $question): RedirectResponse
    {
        $this->authorizeOwn($request, $session);
        abort_unless($question->session_id === $session->id, 404);

        $data = $request->validate([
            'answer' => ['required', 'string', 'max:8000'],
            'duration_seconds' => ['nullable', 'integer', 'between:0,1800'],
        ]);

        $this->evaluator->evaluate($session, $question, $data['answer'], $data['duration_seconds'] ?? null);

        return back()->with('success', 'Jawaban tersimpan.');
    }

    public function complete(Request $request, AiInterviewSession $session): RedirectResponse
    {
        $this->authorizeOwn($request, $session);

        $session->forceFill([
            'completed_at' => now(),
            'duration_seconds' => $session->started_at ? now()->diffInSeconds($session->started_at) : null,
        ])->save();

        $this->analyzer->analyze($session);

        return redirect()->route('employee.ai-interviews.result', ['session' => $session->id]);
    }

    public function result(Request $request, AiInterviewSession $session): Response
    {
        $this->authorizeOwn($request, $session);

        $session->load(['analysis', 'questions.response', 'job:id,title']);

        return Inertia::render('employee/ai-interviews/result', [
            'session' => [
                'id' => $session->id,
                'job_title' => $session->job?->title,
                'is_practice' => $session->is_practice,
                'duration_seconds' => $session->duration_seconds,
                'completed_at' => optional($session->completed_at)->toIso8601String(),
            ],
            'analysis' => $session->analysis ? [
                'overall_score' => $session->analysis->overall_score,
                'fit_score' => $session->analysis->fit_score,
                'recommendation' => $session->analysis->recommendation,
                'summary' => $session->analysis->summary,
                'strengths' => $session->analysis->strengths ?? [],
                'weaknesses' => $session->analysis->weaknesses ?? [],
                'skill_assessment' => $session->analysis->skill_assessment ?? [],
                'communication_score' => $session->analysis->communication_score,
                'technical_score' => $session->analysis->technical_score,
                'problem_solving_score' => $session->analysis->problem_solving_score,
                'culture_fit_score' => $session->analysis->culture_fit_score,
                'red_flags' => $session->analysis->red_flags ?? [],
            ] : null,
            'responses' => $session->questions->map(fn ($q) => [
                'order_number' => $q->order_number,
                'category' => $q->category,
                'question' => $q->question,
                'answer' => $q->response?->answer_text,
                'ai_score' => $q->response?->ai_score,
                'sub_scores' => $q->response?->sub_scores,
                'ai_feedback' => $q->response?->ai_feedback,
            ])->values(),
        ]);
    }

    private function authorizeOwn(Request $request, AiInterviewSession $session): void
    {
        $profile = $this->profiles->ensureProfile($request->user());
        abort_unless($session->candidate_profile_id === $profile->id, 403);
    }
}
