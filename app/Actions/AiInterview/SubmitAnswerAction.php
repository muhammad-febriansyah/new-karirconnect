<?php

namespace App\Actions\AiInterview;

use App\Enums\AiInterviewStatus;
use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewResponse;
use App\Models\AiInterviewSession;
use App\Services\Ai\AiAnswerEvaluatorService;
use App\Services\Sanitizer\HtmlSanitizerService;
use Illuminate\Validation\ValidationException;

class SubmitAnswerAction
{
    public function __construct(
        private readonly AiAnswerEvaluatorService $evaluator,
        private readonly HtmlSanitizerService $sanitizer,
    ) {}

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

        return $this->evaluator->evaluate($session, $question, $answer, $durationSeconds);
    }
}
