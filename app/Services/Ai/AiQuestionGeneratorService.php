<?php

namespace App\Services\Ai;

use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewSession;
use Illuminate\Support\Facades\DB;

class AiQuestionGeneratorService
{
    public function __construct(
        private readonly AiClientFactory $factory,
        private readonly AiAuditService $audit,
    ) {}

    /**
     * Generate and persist questions for a session. Idempotent — returns the
     * existing question set when called twice on the same session, so the
     * runner can safely retry on transient errors.
     *
     * @return array<int, AiInterviewQuestion>
     */
    public function generate(AiInterviewSession $session): array
    {
        if ($session->questions()->exists()) {
            return $session->questions->all();
        }

        $client = $this->factory->make();
        $job = $session->job;
        $count = $session->template?->question_count ?? 6;

        $systemPrompt = $session->system_prompt_snapshot ?: $this->buildSystemPrompt($session);

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => sprintf(
                'Generate %d interview questions in %s for the role "%s". Return JSON shaped {"questions":[{"order_number":1,"category":"opening|technical|behavioral|situational|culture|closing","question":"...","expected_keywords":[...],"max_duration_seconds":120}]}',
                $count,
                $session->language ?? 'id',
                $job?->title ?? 'general role',
            )],
        ];

        $response = $this->audit->run(
            $client,
            'ai_interview',
            $messages,
            ['intent' => 'questions', 'count' => $count],
            $session->candidateProfile?->user_id,
        );

        $payload = $response->asArray() ?? ['questions' => []];

        return DB::transaction(function () use ($session, $payload, $client, $systemPrompt): array {
            $session->forceFill([
                'ai_provider' => $client->provider(),
                'ai_model' => $client->model(),
                'system_prompt_snapshot' => $systemPrompt,
            ])->save();

            $created = [];
            foreach (($payload['questions'] ?? []) as $idx => $row) {
                $created[] = AiInterviewQuestion::query()->create([
                    'session_id' => $session->id,
                    'order_number' => (int) ($row['order_number'] ?? $idx + 1),
                    'category' => (string) ($row['category'] ?? 'technical'),
                    'question' => (string) ($row['question'] ?? ''),
                    'context' => $row['context'] ?? null,
                    'expected_keywords' => $row['expected_keywords'] ?? null,
                    'max_duration_seconds' => (int) ($row['max_duration_seconds'] ?? 120),
                ]);
            }

            return $created;
        });
    }

    private function buildSystemPrompt(AiInterviewSession $session): string
    {
        $job = $session->job;
        $base = 'You are an expert technical interviewer for a job portal. ';
        $base .= 'Generate balanced questions covering opening, technical depth, behavioral, situational, culture, and closing. ';
        $base .= 'Always respond as valid JSON only. Avoid yes/no questions. ';

        if ($job) {
            $base .= "\n\nJob title: {$job->title}.";
            if ($job->experience_level) {
                $base .= "\nLevel: {$job->experience_level->value}.";
            }
            if ($job->description) {
                $base .= "\nDescription excerpt: ".mb_substr(strip_tags($job->description), 0, 500);
            }
        }

        return $base;
    }
}
