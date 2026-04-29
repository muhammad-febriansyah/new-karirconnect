<?php

namespace App\Services\Ai\Clients;

use App\Services\Ai\Contracts\AiClient;
use App\Services\Ai\Contracts\AiResponse;

/**
 * Deterministic AI client for tests and offline development. Inspects the
 * last user message + a hint embedded in the system prompt to decide which
 * fixture-shaped JSON to return so downstream services exercise the same
 * branching logic they would against a real model.
 *
 * Three modes recognised, selected via `options.intent`:
 *   - "questions"  → returns N interview questions
 *   - "evaluation" → returns a per-answer score + sub_scores + feedback
 *   - "analysis"   → returns the final session-level scorecard
 *   - "coach"      → returns a coach-style assistant reply
 *
 * Anything else falls back to a generic acknowledgement so unit tests don't
 * crash on unexpected calls.
 */
class FakeAiClient implements AiClient
{
    public function chat(array $messages, array $options = []): AiResponse
    {
        $intent = $options['intent'] ?? 'generic';
        $count = (int) ($options['count'] ?? 5);
        $payload = match ($intent) {
            'questions' => $this->questionsFixture($count),
            'evaluation' => $this->evaluationFixture(),
            'analysis' => $this->analysisFixture(),
            'coach' => $this->coachFixture(end($messages)['content'] ?? ''),
            default => ['message' => 'ok'],
        };

        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return new AiResponse(
            content: (string) $json,
            promptTokens: 100,
            completionTokens: 200,
            costUsd: 0.0005,
            latencyMs: 50,
            rawJson: (string) $json,
        );
    }

    public function provider(): string
    {
        return 'fake';
    }

    public function model(): string
    {
        return 'fake-model-1';
    }

    /**
     * @return array{questions: array<int, array<string, mixed>>}
     */
    private function questionsFixture(int $count): array
    {
        $bank = [
            ['category' => 'opening', 'question' => 'Ceritakan secara singkat tentang diri Anda dan motivasi Anda melamar posisi ini.', 'expected_keywords' => ['motivasi', 'pengalaman']],
            ['category' => 'technical', 'question' => 'Bagaimana Anda mendekati arsitektur aplikasi yang harus skalabel ke jutaan pengguna?', 'expected_keywords' => ['skalabilitas', 'caching', 'database']],
            ['category' => 'behavioral', 'question' => 'Ceritakan pengalaman Anda menyelesaikan konflik dalam tim.', 'expected_keywords' => ['komunikasi', 'kolaborasi']],
            ['category' => 'situational', 'question' => 'Bagaimana Anda menangani deadline ketat dengan scope yang berubah-ubah?', 'expected_keywords' => ['prioritas', 'komunikasi']],
            ['category' => 'technical', 'question' => 'Jelaskan bagaimana Anda men-debug masalah produksi yang intermittent.', 'expected_keywords' => ['logging', 'monitoring', 'reproduksi']],
            ['category' => 'culture', 'question' => 'Apa yang Anda harapkan dari kultur perusahaan yang Anda ingin bergabung?', 'expected_keywords' => ['transparansi', 'pertumbuhan']],
            ['category' => 'behavioral', 'question' => 'Ceritakan saat Anda mengambil inisiatif tanpa diminta.', 'expected_keywords' => ['inisiatif', 'dampak']],
            ['category' => 'closing', 'question' => 'Apa pertanyaan yang ingin Anda ajukan pada kami?', 'expected_keywords' => []],
        ];

        $questions = [];
        for ($i = 0; $i < min($count, count($bank)); $i++) {
            $questions[] = array_merge(['order_number' => $i + 1, 'max_duration_seconds' => 120], $bank[$i]);
        }

        return ['questions' => $questions];
    }

    /**
     * @return array<string, mixed>
     */
    private function evaluationFixture(): array
    {
        return [
            'ai_score' => 72,
            'sub_scores' => [
                'relevance' => 75,
                'clarity' => 70,
                'technical_accuracy' => 70,
                'communication' => 75,
                'depth' => 65,
            ],
            'ai_feedback' => 'Jawaban relevan dan terstruktur, namun bisa lebih dalam pada aspek teknis.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function analysisFixture(): array
    {
        return [
            'overall_score' => 76,
            'fit_score' => 78,
            'recommendation' => 'hire',
            'summary' => 'Kandidat menunjukkan fundamental yang kuat dan kemampuan komunikasi yang baik. Cocok untuk posisi mid-level.',
            'strengths' => ['Komunikasi jelas', 'Pengalaman praktis solid', 'Mindset belajar terbuka'],
            'weaknesses' => ['Pengalaman system design masih terbatas', 'Bisa lebih asertif dalam memberi pendapat'],
            'skill_assessment' => [
                'PHP' => 4,
                'Laravel' => 4,
                'System Design' => 3,
            ],
            'communication_score' => 80,
            'technical_score' => 72,
            'problem_solving_score' => 70,
            'culture_fit_score' => 78,
            'red_flags' => [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function coachFixture(string $userInput): array
    {
        return [
            'reply' => 'Berdasarkan pertanyaan Anda "'.mb_substr($userInput, 0, 80).'", saran saya: identifikasi 3 prioritas utama untuk minggu ini, lalu eksekusi satu per satu dengan deadline yang jelas. Apakah Anda ingin saya bantu memecah tugas pertama menjadi langkah konkret?',
            'recommendations' => ['Set goal mingguan', 'Tracking harian dengan jurnal singkat'],
        ];
    }
}
