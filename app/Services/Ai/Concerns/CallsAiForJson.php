<?php

namespace App\Services\Ai\Concerns;

use App\Services\Ai\AiAuditService;
use App\Services\Ai\Contracts\AiClient;
use Throwable;

/**
 * Shared resilience layer for services that expect a JSON object back from the
 * model. A single LLM call is unreliable for hiring-grade decisions: the API
 * can throw transiently and the model can emit malformed or off-shape JSON. We
 * retry a small number of times and validate the decoded payload before
 * trusting it, so callers can cleanly fall back to "needs manual review"
 * instead of persisting a fabricated or zero score.
 */
trait CallsAiForJson
{
    /**
     * Run an audited chat call, retrying on transient errors or invalid shape.
     *
     * @param  array<int, array{role:string, content:string}>  $messages
     * @param  array<string, mixed>  $meta
     * @param  callable(array<string, mixed>): bool  $isValid  decides whether the decoded payload is usable
     * @return array<string, mixed>|null validated payload, or null after exhausting retries
     */
    protected function callAiForJson(
        AiAuditService $audit,
        AiClient $client,
        string $feature,
        array $messages,
        array $meta,
        ?int $userId,
        callable $isValid,
        int $maxAttempts = 3,
    ): ?array {
        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = $audit->run(
                    $client,
                    $feature,
                    $messages,
                    $meta + ['attempt' => $attempt],
                    $userId,
                );

                $payload = $response->asArray();

                if (is_array($payload) && $isValid($payload)) {
                    return $payload;
                }
            } catch (Throwable $e) {
                report($e);
            }

            // Linear backoff between attempts. Negligible under the sync queue
            // driver used in tests (the first attempt already succeeds there).
            if ($attempt < $maxAttempts) {
                usleep(200_000 * $attempt);
            }
        }

        return null;
    }
}
