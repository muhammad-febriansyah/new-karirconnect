<?php

namespace App\Services\Billing\Clients;

use App\Models\Order;
use App\Services\Billing\Contracts\PaymentGatewayClient;
use App\Services\Settings\SettingService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Real Midtrans Snap gateway client. Reads merchant credentials from Settings
 * so they can be rotated without redeploying. POSTs to Midtrans Snap API and
 * exposes signature verification for the HTTP notification webhook.
 */
class MidtransClient implements PaymentGatewayClient
{
    public function __construct(private readonly SettingService $settings) {}

    public function createTransaction(Order $order): array
    {
        $serverKey = (string) $this->settings->get('payment.midtrans_server_key');

        if ($serverKey === '') {
            throw new RuntimeException('Midtrans credentials are not configured.');
        }

        // Notification & finish URLs are configured from the Midtrans dashboard,
        // not here. We still provide finish via callbacks so users land on our
        // order detail page on success even before the dashboard URL kicks in.
        $finish = route('payments.midtrans.finish');

        $payload = [
            'transaction_details' => [
                'order_id' => $order->reference,
                'gross_amount' => $order->amount_idr,
            ],
            'customer_details' => [
                'first_name' => $order->user?->name ?? 'Karir Connect',
                'email' => $order->user?->email ?? 'no-reply@karirconnect.test',
            ],
            'item_details' => [[
                'id' => (string) $order->id,
                'price' => $order->amount_idr,
                'quantity' => max(1, (int) $order->quantity),
                'name' => mb_substr($order->description, 0, 50),
            ]],
            'callbacks' => [
                'finish' => $finish,
            ],
            'expiry' => [
                'unit' => 'minute',
                'duration' => 60,
            ],
        ];

        try {
            $response = Http::withBasicAuth($serverKey, '')
                ->asJson()
                ->acceptJson()
                ->timeout(20)
                ->post($this->endpoint('transactions'), $payload)
                ->throw()
                ->json();
        } catch (RequestException $e) {
            throw new RuntimeException('Failed to create Midtrans transaction: '.$e->getMessage(), 0, $e);
        }

        return [
            'redirect_url' => (string) ($response['redirect_url'] ?? ''),
            'reference' => (string) ($response['token'] ?? ''),
            'raw' => is_array($response) ? $response : [],
            'request' => $payload,
        ];
    }

    public function verifyCallback(array $payload): bool
    {
        $serverKey = (string) $this->settings->get('payment.midtrans_server_key');

        $expected = hash('sha512',
            (string) ($payload['order_id'] ?? '').
            (string) ($payload['status_code'] ?? '').
            (string) ($payload['gross_amount'] ?? '').
            $serverKey,
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
        return 'midtrans';
    }

    private function endpoint(string $path): string
    {
        $env = (string) ($this->settings->get('payment.midtrans_environment', 'sandbox') ?: 'sandbox');
        $base = $env === 'production'
            ? 'https://app.midtrans.com/snap/v1'
            : 'https://app.sandbox.midtrans.com/snap/v1';

        return rtrim($base, '/').'/'.ltrim($path, '/');
    }
}
