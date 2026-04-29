<?php

namespace App\Services\Billing\Contracts;

use App\Models\Order;

interface PaymentGatewayClient
{
    /**
     * Create a payment session at the gateway and return the redirect URL +
     * gateway reference + raw response. Caller persists those onto the Order.
     *
     * @return array{
     *   redirect_url: string,
     *   reference: string,
     *   raw: array<string, mixed>,
     *   request: array<string, mixed>
     * }
     */
    public function createTransaction(Order $order): array;

    /**
     * Verify a callback signature so we don't act on forged webhooks.
     *
     * @param  array<string, mixed>  $payload
     */
    public function verifyCallback(array $payload): bool;

    /**
     * Reduce a callback payload to a normalized status string:
     * "success" | "failed" | "expired" | "pending".
     *
     * @param  array<string, mixed>  $payload
     */
    public function normalizeStatus(array $payload): string;

    public function provider(): string;
}
