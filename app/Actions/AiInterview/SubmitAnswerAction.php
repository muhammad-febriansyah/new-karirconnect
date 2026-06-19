<?php

namespace App\Actions\AiInterview;

use App\Enums\AiInterviewStatus;
use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewResponse;
use App\Models\AiInterviewSession;
use App\Services\Sanitizer\HtmlSanitizerService;
use Illuminate\Validation\ValidationException;

class SubmitAnswerAction
{
    public function __construct(
        private readonly HtmlSanitizerService $sanitizer,
    ) {}

    /**
     * Persist a candidate's answer immediately without calling the model, so the
     * UI advances instantly. Scoring is deferred to FinalizeAiInterviewJob at the
     * end of the session (see FinalizeAiInterviewAction), keeping every model
     * call off the request thread.
     */
    public function execute(
        AiInterviewSession $session,
        AiInterviewQuestion $question,
        string $answer,
        ?int $durationSeconds = null,
    ): AiInterviewResponse {
        if ($question->session_id !== $session->id) {
            throw ValidationException::withMessages(['question' => 'Pertanyaan tidak cocok dengan sesi.']);
        }

        if ($session->status !== AiInterviewStatus::InProgress) {
            throw ValidationException::withMessages(['session' => 'Sesi wawancara belum aktif.']);
        }

        $answer = $this->sanitizer->cleanForAi($answer, 8000);

        if ($answer === '') {
            throw ValidationException::withMessages(['answer' => 'Jawaban tidak boleh kosong.']);
        }

        return AiInterviewResponse::query()->updateOrCreate(
            ['session_id' => $session->id, 'question_id' => $question->id],
            [
                'answer_text' => $answer,
                'duration_seconds' => $durationSeconds,
                'evaluated_at' => null,
            ],
        );
    }
}
