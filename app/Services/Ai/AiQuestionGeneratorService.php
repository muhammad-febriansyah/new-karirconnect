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

        // Prefer recruiter-authored template questions when available — these are
        // the ones recruiters wrote in /employer/ai-interview-templates. Only when
        // the template has no questions do we fall back to AI generation.
        $copied = $this->copyFromTemplate($session);
        if ($copied !== null) {
            return $copied;
        }

        $client = $this->factory->make();
        $job = $session->job;
        $count = $session->template?->question_count ?? 6;
        $isEnglish = ($session->language ?? 'id') === 'en';

        $systemPrompt = $session->system_prompt_snapshot ?: $this->buildSystemPrompt($session);

        $userPrompt = $isEnglish
            ? sprintf(
                'Generate %d interview questions IN ENGLISH for the role "%s". Every question text MUST be written in English. Return JSON shaped {"questions":[{"order_number":1,"category":"opening|technical|behavioral|situational|culture|closing","question":"...","expected_keywords":[...],"max_duration_seconds":120}]}.',
                $count,
                $job?->title ?? 'general role',
            )
            : sprintf(
                'Buat %d pertanyaan wawancara DALAM BAHASA INDONESIA untuk posisi "%s". Setiap teks "question" WAJIB ditulis dalam Bahasa Indonesia natural — jangan campur Bahasa Inggris. Kategori tetap pakai kunci bahasa Inggris (opening, technical, behavioral, situational, culture, closing) untuk konsistensi mesin. Kembalikan JSON: {"questions":[{"order_number":1,"category":"opening|technical|behavioral|situational|culture|closing","question":"...","expected_keywords":[...],"max_duration_seconds":120}]}.',
                $count,
                $job?->title ?? 'posisi umum',
            );

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt],
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

    /**
     * @return array<int, AiInterviewQuestion>|null null = template missing or has no questions, caller should fallback
     */
    private function copyFromTemplate(AiInterviewSession $session): ?array
    {
        $template = $session->template;
        if ($template === null) {
            return null;
        }

        $template->loadMissing('questions');
        if ($template->questions->isEmpty()) {
            return null;
        }

        return DB::transaction(function () use ($session, $template): array {
            $session->forceFill([
                'ai_provider' => $session->ai_provider ?? 'template',
                'ai_model' => $session->ai_model ?? 'recruiter-defined',
                'system_prompt_snapshot' => $session->system_prompt_snapshot ?: $this->buildSystemPrompt($session),
            ])->save();

            $created = [];
            foreach ($template->questions as $idx => $tq) {
                $created[] = AiInterviewQuestion::query()->create([
                    'session_id' => $session->id,
                    'order_number' => $tq->order_number ?: ($idx + 1),
                    'category' => $tq->category,
                    'question' => $tq->question,
                    'context' => $tq->context,
                    'expected_keywords' => $tq->expected_keywords,
                    'max_duration_seconds' => $tq->max_duration_seconds,
                ]);
            }

            return $created;
        });
    }

    private function buildSystemPrompt(AiInterviewSession $session): string
    {
        $isEnglish = ($session->language ?? 'id') === 'en';
        $job = $session->job;

        if ($isEnglish) {
            $base = 'You are an expert technical interviewer for a job portal. ';
            $base .= 'All question texts MUST be written in English. ';
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

        // Default: Bahasa Indonesia
        $base = 'Kamu adalah interviewer teknis profesional untuk platform karir di Indonesia. ';
        $base .= 'SEMUA teks pertanyaan WAJIB ditulis dalam Bahasa Indonesia yang natural, sopan, dan profesional — jangan campur Bahasa Inggris kecuali untuk istilah teknis yang tidak punya padanan. ';
        $base .= 'Buat pertanyaan yang seimbang mencakup pembuka (opening), kedalaman teknis (technical), perilaku (behavioral), situasional (situational), budaya kerja (culture), dan penutup (closing). ';
        $base .= 'Selalu balas dalam format JSON valid saja, tanpa teks tambahan. Hindari pertanyaan jawaban ya/tidak. ';

        if ($job) {
            $base .= "\n\nPosisi: {$job->title}.";
            if ($job->experience_level) {
                $base .= "\nLevel: {$job->experience_level->value}.";
            }
            if ($job->description) {
                $base .= "\nKutipan deskripsi pekerjaan: ".mb_substr(strip_tags($job->description), 0, 500);
            }
        }

        return $base;
    }
}
