<?php

namespace App\Exceptions\Ai;

use RuntimeException;
use Throwable;

/**
 * The configured AI provider call failed (quota exhausted, bad key, network
 * error, non-2xx response, ...). Callers should never surface the raw
 * provider error to end users — it can leak account/billing details and
 * reads as a broken app rather than a temporarily unavailable feature.
 *
 * The original exception (with the raw provider message) is kept as
 * `$previous` and already persisted to `ai_audit_logs` by AiAuditService, so
 * nothing is lost for debugging — only what reaches the user is softened.
 */
class AiUnavailableException extends RuntimeException
{
    public function __construct(?Throwable $previous = null)
    {
        parent::__construct('Fitur AI sedang tidak tersedia. Coba lagi beberapa saat lagi.', previous: $previous);
    }
}
