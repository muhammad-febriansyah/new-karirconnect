<?php

namespace App\Services\Ai;

use App\Models\AiCoachMessage;
use App\Models\AiCoachSession;
use App\Models\User;
use App\Services\Sanitizer\HtmlSanitizerService;
use App\Services\Settings\SettingService;

class AiCareerCoachService
{
    public function __construct(
        private readonly AiClientFactory $factory,
        private readonly AiAuditService $audit,
        private readonly SettingService $settings,
        private readonly HtmlSanitizerService $sanitizer,
    ) {}

    /**
     * Append a user message to the session, generate the assistant reply,
     * persist both, and return the assistant message. The coach holds the
     * full conversation history per session so context flows across turns.
     */
    public function reply(AiCoachSession $session, User $user, string $userMessage, ?string $aiContext = null): AiCoachMessage
    {
        $userMessage = $this->sanitizer->cleanForAi($userMessage);
        $aiContext = $aiContext ? $this->sanitizer->cleanForAi($aiContext) : null;

        $userDbMessage = $session->messages()->create([
            'role' => 'user',
            'content' => $userMessage,
        ]);

        $client = $this->factory->make();

        $history = $session->messages()->orderBy('created_at')->get();
        $messages = [['role' => 'system', 'content' => $this->systemPrompt($user)]];
        foreach ($history as $msg) {
            $content = $msg->content;

            if ($aiContext && $msg->id === $userDbMessage->id) {
                $content .= "\n\nKonteks lampiran CV untuk dianalisis:\n".$aiContext;
            }

            $messages[] = ['role' => $msg->role, 'content' => $content];
        }

        $coachModel = (string) ($this->settings->get('ai.model_chat') ?: $client->model());

        $response = $this->audit->run(
            $client,
            'coach',
            $messages,
            ['intent' => 'coach', 'model' => $coachModel, 'max_tokens' => 1500],
            $user->id,
        );

        $assistantContent = $this->composeAssistantContent($response->asArray(), $response->content);

        $session->forceFill(['last_message_at' => now()])->save();

        return $session->messages()->create([
            'role' => 'assistant',
            'content' => $assistantContent,
            'tokens_used' => $response->promptTokens + $response->completionTokens,
            'model_snapshot' => $client->model(),
        ]);
    }

    /**
     * Merge the JSON reply + recommendations into a single readable chat
     * bubble. The model is instructed to always return both fields, so we
     * surface the recommendations as a bullet list — otherwise users only
     * see the short intro sentence stored in `reply`.
     *
     * @param  array<string, mixed>  $payload
     */
    private function composeAssistantContent(array $payload, string $fallback): string
    {
        $reply = trim((string) ($payload['reply'] ?? ''));
        $recommendations = is_array($payload['recommendations'] ?? null) ? $payload['recommendations'] : [];
        $followUp = trim((string) ($payload['follow_up_question'] ?? ''));

        if ($reply === '' && empty($recommendations) && $followUp === '') {
            return trim($fallback) !== '' ? $fallback : 'Maaf, terjadi kendala saat menyusun jawaban. Silakan coba lagi.';
        }

        $parts = [];

        if ($reply !== '') {
            $parts[] = $reply;
        }

        $bullets = collect($recommendations)
            ->map(fn ($item) => trim((string) $item))
            ->filter(fn (string $item) => $item !== '')
            ->values();

        if ($bullets->isNotEmpty()) {
            $parts[] = "Langkah konkret yang bisa Anda lakukan:\n".$bullets
                ->map(fn (string $item) => '• '.$item)
                ->implode("\n");
        }

        if ($followUp !== '') {
            $parts[] = $followUp;
        }

        return implode("\n\n", $parts);
    }

    private function systemPrompt(User $user): string
    {
        return <<<PROMPT
Anda adalah AI Career Coach KarirConnect — pendamping karier yang hangat, profesional, dan praktis untuk pengguna Indonesia.
Pengguna saat ini: {$user->name}.

Cara menjawab:
- Gunakan Bahasa Indonesia yang ramah, jelas, dan profesional. Hindari jargon berlebihan.
- Jawaban harus aplikatif: berikan langkah konkret, contoh kalimat, atau template yang bisa langsung dipakai.
- Sesuaikan saran dengan konteks pasar kerja Indonesia (gaji, perusahaan, budaya kerja, platform seperti LinkedIn/Glints/Jobstreet).
- Jika pengguna mengirim CV (lampiran), berikan analisis spesifik per bagian (ringkasan, pengalaman, skill) dengan kekuatan dan area perbaikan.
- Jika pengguna bertanya soal interview, beri 3–5 pertanyaan + tips menjawab + contoh jawaban singkat.
- Jika soal negosiasi gaji, beri skrip yang sopan tegas dan data benchmark range.
- Selalu akhiri dengan satu pertanyaan tindak lanjut agar percakapan terus berlanjut.

Format wajib (JSON):
{
  "reply": "Jawaban utama dalam paragraf yang mengalir, 2-5 kalimat. Boleh menyebut poin-poin di sini juga, tapi simpan rincian aksi konkret di field 'recommendations'.",
  "recommendations": ["Aksi konkret 1 yang spesifik dan bisa langsung dikerjakan", "Aksi konkret 2", "Aksi konkret 3"],
  "follow_up_question": "Satu pertanyaan singkat untuk memandu pengguna ke topik berikutnya."
}

Aturan ketat:
- Field "reply" wajib berisi paragraf utama (tidak boleh kosong, minimal 2 kalimat).
- Field "recommendations" wajib 3–5 item, masing-masing 1 kalimat aksi yang konkret (bukan teori umum).
- Field "follow_up_question" wajib 1 kalimat pertanyaan terbuka.
- Jangan menjawab "saya tidak bisa mengakses lampiran" jika konteks lampiran sudah disediakan — gunakan teks yang ada.
PROMPT;
    }
}
