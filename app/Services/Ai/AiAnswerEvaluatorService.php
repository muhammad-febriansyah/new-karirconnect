<?php

namespace App\Services\Ai;

use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewResponse;
use App\Models\AiInterviewSession;

class AiAnswerEvaluatorService
{
    public function __construct(
        private readonly AiClientFactory $factory,
        private readonly AiAuditService $audit,
    ) {}

    /**
     * Score a single answer. Persists ai_score + sub_scores + feedback on the
     * response row and returns the updated model. Caller decides whether to
     * fan-out evaluation per question or batch them later.
     */
    public function evaluate(AiInterviewSession $session, AiInterviewQuestion $question, string $answer, ?int $durationSeconds = null): AiInterviewResponse
    {
        $client = $this->factory->make();

        $messages = [
            ['role' => 'system', 'content' => 'You are an expert interview evaluator. Score the answer 0-100 along five dimensions: relevance, clarity, technical_accuracy, communication, depth. Return JSON only: {"ai_score":int, "sub_scores":{...}, "ai_feedback":"..."}'],
            ['role' => 'user', 'content' => sprintf(
                "Question (%s): %s\n\nExpected keywords: %s\n\nCandidate answer: %s",
                $question->category,
                $question->question,
                json_encode($question->expected_keywords ?? []),
                $answer,
            )],
        ];

        $response = $this->audit->run(
            $client,
            'ai_interview',
            $messages,
            ['intent' => 'evaluation'],
            $session->candidateProfile?->user_id,
        );

        $payload = $response->asArray() ?? [];

        return AiInterviewResponse::query()->updateOrCreate(
            ['session_id' => $session->id, 'question_id' => $question->id],
            [
                'answer_text' => $answer,
                'duration_seconds' => $durationSeconds,
                'ai_score' => (int) ($payload['ai_score'] ?? 0),
                'sub_scores' => $payload['sub_scores'] ?? null,
                'ai_feedback' => $payload['ai_feedback'] ?? null,
                'evaluated_at' => now(),
            ],
        );
    }
}
