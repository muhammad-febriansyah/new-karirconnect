<?php

namespace App\Exceptions\Billing;

use RuntimeException;

/**
 * Thrown by BillingService when the gateway-provided signature does not match
 * what the merchant secret produces. The webhook controller maps this to HTTP
 * 401 so the gateway treats the request as deliberately rejected and does NOT
 * retry — replaying a forged signature would only burn quota.
 */
class InvalidWebhookSignatureException extends RuntimeException
{
    public function __construct(string $message = 'Invalid callback signature.')
    {
        parent::__construct($message);
    }
}
