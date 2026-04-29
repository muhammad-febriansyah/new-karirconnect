<?php

namespace App\Services\Billing\Clients;

use App\Models\Order;
use App\Services\Billing\Contracts\PaymentGatewayClient;
use App\Services\Settings\SettingService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Real Duitku gateway client. Reads merchant credentials from Settings so they
 * can be rotated without redeploying. POSTs to Duitku's createInvoice endpoint
 * and exposes signature verification for the callback webhook.
 */
class DuitkuClient implements PaymentGatewayClient
{
    public function __construct(private readonly SettingService $settings) {}

    public function createTransaction(Order $order): array
    {
        $merchantCode = (string) $this->settings->get('payment.duitku_merchant_code');
        $apiKey = (string) $this->settings->get('payment.duitku_api_key');

        if ($merchantCode === '' || $apiKey === '') {
            throw new RuntimeException('Duitku credentials are not configured.');
        }

        $callback = (string) ($this->settings->get('payment.duitku_callback_url')
            ?: route('payments.duitku.callback'));
        $return = (string) ($this->settings->get('payment.duitku_return_url')
            ?: route('payments.duitku.return'));

        $signature = md5($merchantCode.$order->reference.$order->amount_idr.$apiKey);

        $payload = [
            'merchantCode' => $merchantCode,
            'paymentAmount' => $order->amount_idr,
            'paymentMethod' => '',
            'merchantOrderId' => $order->reference,
            'productDetails' => $order->description,
            'customerVaName' => $order->user?->name ?? 'Karir Connect',
            'email' => $order->user?->email ?? 'no-reply@karirconnect.test',
            'callbackUrl' => $callback,
            'returnUrl' => $return,
            'signature' => $signature,
            'expiryPeriod' => 60,
        ];

        try {
            $response = Http::asJson()
                ->acceptJson()
                ->timeout(20)
                ->post($this->endpoint('webapi/api/merchant/v2/inquiry'), $payload)
                ->throw()
                ->json();
        } catch (RequestException $e) {
            throw new RuntimeException('Failed to create Duitku transaction: '.$e->getMessage(), 0, $e);
        }

        return [
            'redirect_url' => (string) ($response['paymentUrl'] ?? ''),
            'reference' => (string) ($response['reference'] ?? ''),
            'raw' => is_array($response) ? $response : [],
            'request' => $payload,
        ];
    }

    public function verifyCallback(array $payload): bool
    {
        $merchantCode = (string) $this->settings->get('payment.duitku_merchant_code');
        $apiKey = (string) $this->settings->get('payment.duitku_api_key');

        $expected = md5(
            $merchantCode.
            (string) ($payload['amount'] ?? '').
            (string) ($payload['merchantOrderId'] ?? '').
            $apiKey,
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
        return 'duitku';
    }

    private function endpoint(string $path): string
    {
        $env = (string) ($this->settings->get('payment.duitku_environment', 'sandbox') ?: 'sandbox');
        $base = $env === 'production'
            ? 'https://passport.duitku.com'
            : 'https://sandbox.duitku.com';

        return rtrim($base, '/').'/'.ltrim($path, '/');
    }
}
