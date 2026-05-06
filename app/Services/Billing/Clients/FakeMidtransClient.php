<?php

namespace App\Services\Billing\Clients;

use App\Models\Order;
use App\Services\Billing\Contracts\PaymentGatewayClient;
use Illuminate\Support\Str;

/**
 * Deterministic Midtrans stand-in for tests and offline development. Mirrors
 * the shape of the real client so the BillingService and webhook handler can
 * run end-to-end without the sandbox.
 */
class FakeMidtransClient implements PaymentGatewayClient
{
    public function createTransaction(Order $order): array
    {
        $token = 'mt-fake-'.Str::lower(Str::random(20));

        return [
            'redirect_url' => 'https://app.sandbox.midtrans.test/snap/v3/redirection/'.$token,
            'reference' => $token,
            'raw' => [
                'token' => $token,
                'redirect_url' => 'https://app.sandbox.midtrans.test/snap/v3/redirection/'.$token,
            ],
            'request' => [
                'transaction_details' => [
                    'order_id' => $order->reference,
                    'gross_amount' => $order->amount_idr,
                ],
            ],
        ];
    }

    public function verifyCallback(array $payload): bool
    {
        $expected = $this->expectedSignature(
            (string) ($payload['order_id'] ?? ''),
            (string) ($payload['status_code'] ?? ''),
            (string) ($payload['gross_amount'] ?? ''),
        );

        return hash_equals($expected, (string) ($payload['signature_key'] ?? ''));
    }

    public function normalizeStatus(array $payload): string
    {
        $status = (string) ($payload['transaction_status'] ?? '');
        $fraud = (string) ($payload['fraud_status'] ?? 'accept');

        return match ($status) {
            'settlement' => 'success',
            'capture' => $fraud === 'accept' ? 'success' : 'pending',
            'authorize', 'pending' => 'pending',
            'deny', 'cancel', 'failure' => 'failed',
            'expire' => 'expired',
            default => 'failed',
        };
    }

    public function provider(): string
    {
        return 'midtrans-fake';
    }

    /**
     * Expose the deterministic signature so tests can post valid webhooks
     * without leaking real merchant credentials.
     */
    public function expectedSignature(string $orderId, string $statusCode, string $grossAmount): string
    {
        return hash('sha512', $orderId.$statusCode.$grossAmount.'FAKEKEY');
    }
}
