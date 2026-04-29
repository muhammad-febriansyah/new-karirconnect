<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Models\AiInterviewSession;
use App\Models\Company;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiInterviewReviewController extends Controller
{
    public function index(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $sessions = AiInterviewSession::query()
            ->with(['analysis:id,session_id,overall_score,recommendation', 'candidateProfile.user:id,name,email', 'job:id,title,slug'])
            ->whereHas('job', fn ($q) => $q->where('company_id', $company->id))
            ->where('status', 'completed')
            ->orderByDesc('completed_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (AiInterviewSession $s) => [
                'id' => $s->id,
                'completed_at' => optional($s->completed_at)->toIso8601String(),
                'duration_seconds' => $s->duration_seconds,
                'candidate_name' => $s->candidateProfile?->user?->name,
                'candidate_email' => $s->candidateProfile?->user?->email,
                'job_title' => $s->job?->title,
                'job_slug' => $s->job?->slug,
                'overall_score' => $s->analysis?->overall_score,
                'recommendation' => $s->analysis?->recommendation,
            ]);

        return Inertia::render('employer/ai-interviews/index', [
            'sessions' => $sessions,
        ]);
    }

    public function show(Request $request, AiInterviewSession $session): Response
    {
        $this->authorizeSession($request, $session);

        $session->load(['analysis', 'questions.response', 'candidateProfile.user:id,name,email', 'job:id,title']);

        return Inertia::render('employer/ai-interviews/show', [
            'session' => [
                'id' => $session->id,
                'job_title' => $session->job?->title,
                'candidate_name' => $session->candidateProfile?->user?->name,
                'candidate_email' => $session->candidateProfile?->user?->email,
                'duration_seconds' => $session->duration_seconds,
                'completed_at' => optional($session->completed_at)->toIso8601String(),
            ],
            'analysis' => $session->analysis,
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

    private function resolveCompany(Request $request): ?Company
    {
        return Company::query()->where('owner_id', $request->user()->id)->first();
    }

    private function authorizeSession(Request $request, AiInterviewSession $session): void
    {
        $company = $this->resolveCompany($request);
        $session->loadMissing('job:id,company_id');

        abort_unless(
            $company !== null && $session->job?->company_id === $company->id,
            403,
        );
    }
}
