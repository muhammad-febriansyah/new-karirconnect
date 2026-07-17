<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Models\AiInterviewSession;
use App\Models\CandidateOutreachMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The employer's view of AI interviews their candidates sat, plus the outreach
 * they have sent.
 */
class AiInterviewReviewController extends Controller
{
    use ResolvesEmployerCompany;

    public function index(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $sessions = AiInterviewSession::query()
            ->with([
                'job:id,title,slug,company_id',
                'candidateProfile.user:id,name',
                'analysis',
            ])
            // Practice sessions are the candidate's own rehearsal and belong to
            // nobody's hiring pipeline; only real, job-linked sessions surface.
            ->where('is_practice', false)
            ->whereHas('job', fn ($query) => $query->where('company_id', $company->id))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('job'), fn ($query) => $query->where('job_id', $request->integer('job')))
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($sessions->items())->map(fn (AiInterviewSession $session) => $this->present($session))->values(),
            'meta' => ['total' => $sessions->total()],
        ]);
    }

    public function show(Request $request, AiInterviewSession $session): JsonResponse
    {
        $this->authorizeSession($request, $session);

        $session->load(['analysis', 'questions.response', 'candidateProfile.user:id,name,email', 'job:id,title,slug']);

        return response()->json([
            'data' => [
                ...$this->present($session),
                'questions' => $session->questions->map(fn ($question) => [
                    'id' => $question->id,
                    'order_number' => $question->order_number,
                    'category' => $question->category,
                    'question' => $question->question,
                    'answer' => $question->response?->answer,
                    'score' => $question->response?->score,

                    // Integrity signals recorded while the candidate answered.
                    'paste_count' => $question->response?->paste_count,
                    'focus_loss_count' => $question->response?->focus_loss_count,
                ])->values(),
                'analysis' => $session->analysis === null ? null : [
                    'status' => $session->analysis->status,
                    'overall_score' => $session->analysis->overall_score,
                    'fit_score' => $session->analysis->fit_score,
                    'recommendation' => $session->analysis->recommendation,
                    'summary' => $session->analysis->summary,
                    'strengths' => $session->analysis->strengths,
                    'weaknesses' => $session->analysis->weaknesses,
                    'red_flags' => $session->analysis->red_flags,
                    'communication_score' => $session->analysis->communication_score,
                    'technical_score' => $session->analysis->technical_score,
                    'problem_solving_score' => $session->analysis->problem_solving_score,
                    'culture_fit_score' => $session->analysis->culture_fit_score,
                ],
            ],
        ]);
    }

    /**
     * Outreach this company has sent to candidates.
     */
    public function outreach(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $messages = CandidateOutreachMessage::query()
            ->with(['candidateUser:id,name', 'sender:id,name', 'job:id,title'])
            ->where('company_id', $company->id)
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($messages->items())->map(fn (CandidateOutreachMessage $message) => [
                'id' => $message->id,
                'candidate' => $message->candidateUser?->name,
                'sender' => $message->sender?->name,
                'job' => $message->job?->title,
                'subject' => $message->subject,
                'body' => $message->body,
                'status' => $message->status,
                'sent_at' => $message->sent_at?->toIso8601String(),
                'replied_at' => $message->replied_at?->toIso8601String(),
            ])->values(),
            'meta' => ['total' => $messages->total()],
        ]);
    }

    private function authorizeSession(Request $request, AiInterviewSession $session): void
    {
        $company = $this->resolveCompany($request);

        $session->loadMissing('job:id,company_id');

        abort_unless($company !== null && $session->job?->company_id === $company->id, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(AiInterviewSession $session): array
    {
        return [
            'id' => $session->id,
            'status' => $session->status?->value ?? $session->status,
            'mode' => $session->mode?->value ?? $session->mode,
            'language' => $session->language,
            'candidate' => [
                'profile_id' => $session->candidate_profile_id,
                'name' => $session->candidateProfile?->user?->name,
            ],
            'job' => $session->job === null ? null : [
                'id' => $session->job->id,
                'title' => $session->job->title,
                'slug' => $session->job->slug,
            ],
            'overall_score' => $session->analysis?->overall_score,
            'recommendation' => $session->analysis?->recommendation,
            'created_at' => $session->created_at?->toIso8601String(),
        ];
    }
}
