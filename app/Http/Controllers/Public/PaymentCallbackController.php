<?php

namespace App\Http\Controllers\Public;

use App\Enums\OrderStatus;
use App\Exceptions\Billing\InvalidWebhookSignatureException;
use App\Exceptions\Billing\WebhookAmountMismatchException;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Billing\BillingService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class PaymentCallbackController extends Controller
{
    /**
     * Field names to redact before writing webhook payloads to the log.
     * Signatures + raw tokens leak data that could help an attacker forge
     * future callbacks if logs are ever exposed.
     */
    private const REDACTED_FIELDS = ['signature', 'apiKey', 'api_key', 'merchant_password'];

    public function __construct(private readonly BillingService $billing) {}

    /**
     * Server-to-server webhook from Duitku. We map exceptions to HTTP status
     * codes deliberately so the gateway only retries when we want it to:
     *  - 401 invalid signature → forged/expired, do NOT retry
     *  - 404 unknown order → permanent, do NOT retry
     *  - 422 amount mismatch → permanent, do NOT retry
     *  - 500 internal/transient → DO retry
     *  - 200 success / already-final → do not retry
     */
    public function callback(Request $request): JsonResponse
    {
        $payload = $request->all();

        try {
            $order = $this->billing->handleCallback($payload);

            return response()->json([
                'status' => 'ok',
                'order' => $order->reference,
                'order_status' => $order->status->value,
            ]);
        } catch (InvalidWebhookSignatureException $e) {
            $this->logFailure('payment.callback.invalid_signature', $payload, $e);

            return response()->json(['status' => 'invalid_signature'], 401);
        } catch (ModelNotFoundException $e) {
            $this->logFailure('payment.callback.order_not_found', $payload, $e);

            return response()->json(['status' => 'order_not_found'], 404);
        } catch (WebhookAmountMismatchException $e) {
            $this->logFailure('payment.callback.amount_mismatch', $payload, $e);

            return response()->json(['status' => 'amount_mismatch'], 422);
        } catch (Throwable $e) {
            $this->logFailure('payment.callback.failed', $payload, $e);

            return response()->json(['status' => 'error'], 500);
        }
    }

    /**
     * Browser return URL after the user finishes the gateway flow. We just
     * bounce them back into the order detail page with a status toast so the
     * user gets immediate feedback even before the webhook lands.
     */
    public function return(Request $request): RedirectResponse
    {
        $reference = (string) $request->query('merchantOrderId', '');

        if ($reference === '') {
            return redirect()->route('home');
        }

        $order = Order::query()->where('reference', $reference)->first();
        if (! $order) {
            return redirect()->route('home');
        }

        $redirect = redirect()->route('employer.billing.show', ['order' => $order->reference]);

        return match ($order->status) {
            OrderStatus::Paid => $redirect->with('success', 'Pembayaran berhasil. Berlangganan Anda sudah aktif.'),
            OrderStatus::Failed => $redirect->with('error', 'Pembayaran gagal. Silakan coba lagi atau gunakan metode lain.'),
            OrderStatus::Expired => $redirect->with('error', 'Pembayaran kedaluwarsa. Silakan buat pesanan baru.'),
            OrderStatus::Cancelled => $redirect->with('warning', 'Pembayaran dibatalkan.'),
            default => $redirect->with('info', 'Pembayaran sedang diproses. Status akan diperbarui otomatis dalam beberapa saat.'),
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function logFailure(string $channel, array $payload, Throwable $e): void
    {
        Log::warning($channel, [
            'reason' => $e->getMessage(),
            'payload' => $this->redact($payload),
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function redact(array $payload): array
    {
        foreach (self::REDACTED_FIELDS as $field) {
            if (array_key_exists($field, $payload)) {
                $payload[$field] = '[redacted]';
            }
        }

        return $payload;
    }
}
