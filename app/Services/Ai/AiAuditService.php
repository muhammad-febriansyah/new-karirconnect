<?php

namespace App\Services\Ai;

use App\Models\AiAuditLog;
use App\Services\Ai\Contracts\AiClient;
use App\Services\Ai\Contracts\AiResponse;
use Throwable;

/**
 * Wraps any AiClient call with persistent telemetry: every prompt (and its
 * outcome) lands in `ai_audit_logs` so admins can review usage, cost, and
 * failure modes in one place. Wrapping happens in-process so we capture the
 * exact prompt that produced a given completion.
 */
class AiAuditService
{
    /**
     * @param  array<int, array{role:string, content:string}>  $messages
     * @param  array<string, mixed>  $options
     */
    public function run(
        AiClient $client,
        string $feature,
        array $messages,
        array $options = [],
        ?int $userId = null,
    ): AiResponse {
        $log = AiAuditLog::query()->create([
            'user_id' => $userId,
            'feature' => $feature,
            'provider' => $client->provider(),
            'model' => $options['model'] ?? $client->model(),
            'input_json' => ['messages' => $messages, 'options' => $options],
            'status' => 'pending',
        ]);

        try {
            $response = $client->chat($messages, $options);

            $log->forceFill([
                'prompt_tokens' => $response->promptTokens,
                'completion_tokens' => $response->completionTokens,
                'total_cost_usd' => $response->costUsd,
                'latency_ms' => $response->latencyMs,
                'output_json' => ['content' => $response->content],
                'status' => 'success',
            ])->save();

            return $response;
        } catch (Throwable $e) {
            $log->forceFill([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ])->save();

            throw $e;
        }
    }
}
