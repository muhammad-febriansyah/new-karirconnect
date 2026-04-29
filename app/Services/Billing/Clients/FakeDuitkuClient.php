<?php

namespace App\Services\Billing\Clients;

use App\Models\Order;
use App\Services\Billing\Contracts\PaymentGatewayClient;
use Illuminate\Support\Str;

/**
 * Deterministic Duitku stand-in for tests and offline development. Mirrors the
 * shape of the real client so the BillingService and webhook handler can run
 * end-to-end without the sandbox.
 */
class FakeDuitkuClient implements PaymentGatewayClient
{
    public function createTransaction(Order $order): array
    {
        $reference = 'DUITKU-FAKE-'.Str::upper(Str::random(10));

        return [
            'redirect_url' => 'https://sandbox.duitku.test/pay/'.$reference,
            'reference' => $reference,
            'raw' => [
                'merchantCode' => 'FAKEMERCHANT',
                'reference' => $reference,
                'paymentUrl' => 'https://sandbox.duitku.test/pay/'.$reference,
                'statusCode' => '00',
                'statusMessage' => 'SUCCESS',
            ],
            'request' => [
                'merchantOrderId' => $order->reference,
                'paymentAmount' => $order->amount_idr,
                'productDetails' => $order->description,
            ],
        ];
    }

    public function verifyCallback(array $payload): bool
    {
        $expected = $this->expectedSignature(
            (string) ($payload['merchantCode'] ?? ''),
            (string) ($payload['amount'] ?? ''),
            (string) ($payload['merchantOrderId'] ?? ''),
        );

        return hash_equals($expected, (string) ($payload['signature'] ?? ''));
    }

    public function normalizeStatus(array $payload): string
    {
        return match ((string) ($payload['resultCode'] ?? '')) {
            '00' => 'success',
            '01' => 'pending',
            '02' => 'failed',
            '03' => 'expired',
            default => 'failed',
        };
    }

    public function provider(): string
    {
        return 'duitku-fake';
    }

    /**
     * Expose the deterministic signature so tests can post valid webhooks
     * without leaking real merchant credentials.
     */
    public function expectedSignature(string $merchantCode, string $amount, string $merchantOrderId): string
    {
        return md5($merchantCode.$amount.$merchantOrderId.'FAKEKEY');
    }
}
