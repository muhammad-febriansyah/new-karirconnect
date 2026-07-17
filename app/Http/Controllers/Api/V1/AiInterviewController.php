<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\AiInterview\FinalizeAiInterviewAction;
use App\Actions\AiInterview\StartAiInterviewAction;
use App\Actions\AiInterview\SubmitAnswerAction;
use App\Http\Controllers\Controller;
use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewSession;
use App\Services\Ai\AiQuotaService;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * AI interview sessions for the candidate.
 *
 * Text mode only. The web additionally supports realtime voice, which needs an
 * ephemeral client secret and direct audio upload to the provider -- that is a
 * browser-specific transport and is deliberately not mirrored here; a mobile
 * client can switch a session to text and run it through these endpoints.
 */
class AiInterviewController extends Controller
{
    public function __construct(
        private readonly EmployeeProfileService $profiles,
        private readonly StartAiInterviewAction $start,
        private readonly SubmitAnswerAction $submitAnswer,
        private readonly FinalizeAiInterviewAction $finalize,
        private readonly AiQuotaService $quota,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $sessions = AiInterviewSession::query()
            ->with(['job:id,title,slug', 'analysis'])
            ->where('candidate_profile_id', $profile->id)
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($sessions->items())->map(fn (AiInterviewSession $session) => $this->present($session)),
            'meta' => ['total' => $sessions->total()],
        ]);
    }

    /**
     * Start a practice session. Quota-limited.
     */
    public function startPractice(Request $request): JsonResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        // Throws ValidationException (keyed "quota") when the monthly free-session
        // limit is spent, which already renders as a 422 for api/*.
        $this->quota->ensurePracticeAllowed($profile);

        $data = $request->validate([
            'language' => ['nullable', Rule::in(['id', 'en'])],
        ]);

        $session = AiInterviewSession::query()->create([
            'candidate_profile_id' => $profile->id,
            'mode' => 'text',
            'language' => $data['language'] ?? 'id',
            'status' => 'pending',
            'is_practice' => true,
        ]);

        $this->start->execute($session);

        return response()->json(['data' => $this->present($session->fresh(['questions']))], 201);
    }

    /**
     * The session plus its questions, for running the interview.
     */
    public function show(Request $request, AiInterviewSession $session): JsonResponse
    {
        $this->authorizeOwn($request, $session);

        $session->load(['questions.response', 'job:id,title,slug']);

        return response()->json([
            'data' => [
                ...$this->present($session),
                'questions' => $session->questions->map(fn (AiInterviewQuestion $question) => [
                    'id' => $question->id,
                    'order_number' => $question->order_number,
                    'question' => $question->question,
                    'answered' => $question->response !== null,
                    'answer' => $question->response?->answer,
                ])->values(),
            ],
        ]);
    }

    public function answer(Request $request, AiInterviewSession $session, AiInterviewQuestion $question): JsonResponse
    {
        $this->authorizeOwn($request, $session);

        // The question must belong to this session, or a candidate could answer
        // into someone else's interview by id.
        abort_unless($question->session_id === $session->id, 404);

        $data = $request->validate([
            'answer' => ['required', 'string', 'max:8000'],
            'duration_seconds' => ['nullable', 'integer', 'between:0,1800'],
            'paste_count' => ['nullable', 'integer', 'between:0,1000'],
            'focus_loss_count' => ['nullable', 'integer', 'between:0,1000'],
        ]);

        $this->submitAnswer->execute(
            $session,
            $question,
            $data['answer'],
            $data['duration_seconds'] ?? null,
            $data['paste_count'] ?? null,
            $data['focus_loss_count'] ?? null,
        );

        return response()->json(['message' => 'Jawaban tersimpan.']);
    }

    public function complete(Request $request, AiInterviewSession $session): JsonResponse
    {
        $this->authorizeOwn($request, $session);

        $this->finalize->execute($session);

        return response()->json(['data' => $this->present($session->fresh(['analysis']))]);
    }

    /**
     * The analysis, once the session has been finalised.
     */
    public function result(Request $request, AiInterviewSession $session): JsonResponse
    {
        $this->authorizeOwn($request, $session);

        $session->load(['analysis', 'questions.response', 'job:id,title,slug']);

        return response()->json([
            'data' => [
                ...$this->present($session),
                'analysis' => $session->analysis === null ? null : [
                    'status' => $session->analysis->status,
                    'overall_score' => $session->analysis->overall_score,
                    'summary' => $session->analysis->summary,
                    'strengths' => $session->analysis->strengths,
                    'weaknesses' => $session->analysis->weaknesses,
                    'recommendation' => $session->analysis->recommendation,
                ],
            ],
        ]);
    }

    private function authorizeOwn(Request $request, AiInterviewSession $session): void
    {
        $profile = $this->profiles->ensureProfile($request->user());

        abort_unless($session->candidate_profile_id === $profile->id, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(AiInterviewSession $session): array
    {
        return [
            'id' => $session->id,
            'mode' => $session->mode?->value ?? $session->mode,
            'language' => $session->language,
            'status' => $session->status?->value ?? $session->status,
            'is_practice' => (bool) $session->is_practice,
            'expires_at' => $session->expires_at?->toIso8601String(),
            'job' => $session->job === null ? null : [
                'id' => $session->job->id,
                'title' => $session->job->title,
                'slug' => $session->job->slug,
            ],
            'created_at' => $session->created_at?->toIso8601String(),
        ];
    }
}
