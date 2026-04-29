<?php

namespace App\Services\Ai;

use App\Models\AiCoachMessage;
use App\Models\AiCoachSession;
use App\Models\User;

class AiCareerCoachService
{
    public function __construct(
        private readonly AiClientFactory $factory,
        private readonly AiAuditService $audit,
    ) {}

    /**
     * Append a user message to the session, generate the assistant reply,
     * persist both, and return the assistant message. The coach holds the
     * full conversation history per session so context flows across turns.
     */
    public function reply(AiCoachSession $session, User $user, string $userMessage): AiCoachMessage
    {
        $session->messages()->create([
            'role' => 'user',
            'content' => $userMessage,
        ]);

        $client = $this->factory->make();

        $history = $session->messages()->orderBy('created_at')->get();
        $messages = [['role' => 'system', 'content' => $this->systemPrompt($user)]];
        foreach ($history as $msg) {
            $messages[] = ['role' => $msg->role, 'content' => $msg->content];
        }

        $response = $this->audit->run(
            $client,
            'coach',
            $messages,
            ['intent' => 'coach'],
            $user->id,
        );

        $assistantContent = $response->asArray()['reply'] ?? $response->content;

        $session->forceFill(['last_message_at' => now()])->save();

        return $session->messages()->create([
            'role' => 'assistant',
            'content' => (string) $assistantContent,
            'tokens_used' => $response->promptTokens + $response->completionTokens,
            'model_snapshot' => $client->model(),
        ]);
    }

    private function systemPrompt(User $user): string
    {
        return 'You are a friendly Indonesian career coach for KarirConnect. '.
            "Help {$user->name} navigate career decisions: skill development, interview prep, salary negotiation, and personal branding. ".
            'Always reply as JSON {"reply":"...","recommendations":["..."]}. '.
            'Keep replies actionable, warm, and rooted in Indonesian context.';
    }
}
