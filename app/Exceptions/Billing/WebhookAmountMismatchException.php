<?php

namespace App\Exceptions\Billing;

use RuntimeException;

/**
 * Defense-in-depth: even with a valid signature, the payload's amount must
 * match the original order amount. Mismatched amounts are a permanent error
 * (we won't apply entitlement at the wrong price) so the controller maps this
 * to HTTP 422 — gateway should not retry the same payload.
 */
class WebhookAmountMismatchException extends RuntimeException
{
    public function __construct(int $expected, int $received)
    {
        parent::__construct("Callback amount {$received} does not match order amount {$expected}.");
    }
}
