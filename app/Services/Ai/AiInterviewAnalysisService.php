<?php

namespace App\Services\Ai;

use App\Models\AiInterviewAnalysis;
use App\Models\AiInterviewSession;

class AiInterviewAnalysisService
{
    public function __construct(
        private readonly AiClientFactory $factory,
        private readonly AiAuditService $audit,
    ) {}

    /**
     * Aggregate per-question evaluations into a session-level analysis.
     * The analysis is upserted: re-running on the same session refreshes the
     * scores rather than creating duplicates.
     */
    public function analyze(AiInterviewSession $session): AiInterviewAnalysis
    {
        $session->load(['questions.response', 'job:id,title']);

        $client = $this->factory->make();

        $transcript = $session->questions->map(function ($q) {
            $resp = $q->response;
            $score = $resp?->ai_score ?? 0;

            return "Q{$q->order_number} [{$q->category}, score={$score}]: {$q->question}\nA: ".
                ($resp?->answer_text ?? '(no answer)');
        })->implode("\n\n");

        $messages = [
            ['role' => 'system', 'content' => 'You are a senior hiring manager. Produce a comprehensive analysis of this interview as JSON only: {"overall_score":0-100,"fit_score":0-100,"recommendation":"strong_hire|hire|no_hire|strong_no_hire","summary":"...","strengths":[...],"weaknesses":[...],"skill_assessment":{...},"communication_score":0-100,"technical_score":0-100,"problem_solving_score":0-100,"culture_fit_score":0-100,"red_flags":[...]}'],
            ['role' => 'user', 'content' => 'Job: '.($session->job?->title ?? 'N/A')."\n\nFull transcript:\n\n{$transcript}"],
        ];

        $response = $this->audit->run(
            $client,
            'ai_interview',
            $messages,
            ['intent' => 'analysis'],
            $session->candidateProfile?->user_id,
        );

        $payload = $response->asArray() ?? [];

        $analysis = AiInterviewAnalysis::query()->updateOrCreate(
            ['session_id' => $session->id],
            [
                'overall_score' => (int) ($payload['overall_score'] ?? 0),
                'fit_score' => (int) ($payload['fit_score'] ?? 0),
                'recommendation' => (string) ($payload['recommendation'] ?? 'no_hire'),
                'summary' => (string) ($payload['summary'] ?? ''),
                'strengths' => $payload['strengths'] ?? null,
                'weaknesses' => $payload['weaknesses'] ?? null,
                'skill_assessment' => $payload['skill_assessment'] ?? null,
                'communication_score' => $payload['communication_score'] ?? null,
                'technical_score' => $payload['technical_score'] ?? null,
                'problem_solving_score' => $payload['problem_solving_score'] ?? null,
                'culture_fit_score' => $payload['culture_fit_score'] ?? null,
                'red_flags' => $payload['red_flags'] ?? null,
                'generated_at' => now(),
            ],
        );

        $session->forceFill([
            'status' => 'completed',
            'completed_at' => $session->completed_at ?? now(),
        ])->save();

        return $analysis;
    }
}
