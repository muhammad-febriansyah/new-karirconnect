<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Billing\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class PaymentCallbackController extends Controller
{
    public function __construct(private readonly BillingService $billing) {}

    /**
     * Server-to-server webhook from Duitku. Always returns 200 with a status
     * marker so the gateway treats the call as delivered; we surface failure
     * details in `body.status` rather than HTTP codes to avoid retry storms.
     */
    public function callback(Request $request): JsonResponse
    {
        try {
            $order = $this->billing->handleCallback($request->all());

            return response()->json([
                'status' => 'ok',
                'order' => $order->reference,
                'order_status' => $order->status->value,
            ]);
        } catch (Throwable $e) {
            Log::warning('payment.callback.failed', [
                'reason' => $e->getMessage(),
                'payload' => $request->all(),
            ]);

            return response()->json([
                'status' => 'rejected',
                'reason' => $e->getMessage(),
            ], 200);
        }
    }

    /**
     * Browser return URL after the user finishes the gateway flow. We just
     * bounce them back into the order detail page.
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

        return redirect()->route('employer.billing.show', ['order' => $order->reference]);
    }
}
