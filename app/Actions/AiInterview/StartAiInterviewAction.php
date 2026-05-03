<?php

namespace App\Actions\AiInterview;

use App\Enums\AiInterviewStatus;
use App\Models\AiInterviewSession;
use App\Services\Ai\AiQuestionGeneratorService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StartAiInterviewAction
{
    public function __construct(private readonly AiQuestionGeneratorService $questions) {}

    /**
     * Move a session into in_progress state. Idempotent — safe to call again
     * after a transient failure: questions are only generated once.
     */
    public function execute(AiInterviewSession $session): AiInterviewSession
    {
        if ($session->status === AiInterviewStatus::Completed) {
            throw ValidationException::withMessages(['session' => 'Sesi wawancara sudah selesai.']);
        }

        if ($session->status === AiInterviewStatus::Expired) {
            throw ValidationException::withMessages(['session' => 'Sesi wawancara sudah kedaluwarsa.']);
        }

        if ($session->status === AiInterviewStatus::Cancelled) {
            throw ValidationException::withMessages(['session' => 'Sesi wawancara sudah dibatalkan.']);
        }

        if ($session->expires_at !== null && $session->expires_at->isPast()) {
            $session->forceFill(['status' => AiInterviewStatus::Expired])->save();

            throw ValidationException::withMessages(['session' => 'Sesi wawancara sudah kedaluwarsa.']);
        }

        return DB::transaction(function () use ($session): AiInterviewSession {
            if (! $session->questions()->exists()) {
                $this->questions->generate($session);
            }

            if ($session->status !== AiInterviewStatus::InProgress) {
                $session->forceFill([
                    'status' => AiInterviewStatus::InProgress,
                    'started_at' => $session->started_at ?? now(),
                ])->save();
            }

            return $session->fresh(['questions']);
        });
    }
}
