<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CompanySubscription;
use App\Models\Order;
use App\Models\PaymentTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin read-only views over money and audit trails.
 *
 * Deliberately read-only: entitlement is granted by BillingService when the
 * Midtrans webhook confirms payment. An admin endpoint that flipped an order to
 * paid by hand would hand out subscriptions without money changing hands.
 */
class BillingController extends Controller
{
    public function orders(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->with(['company:id,name,slug', 'user:id,name,email'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('search'), fn ($query) => $query->where('reference', 'like', '%'.$request->string('search')->toString().'%'))
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($orders->items())->map(fn (Order $order) => [
                'reference' => $order->reference,
                'company' => $order->company?->name,
                'buyer' => $order->user?->name,
                'item_type' => $order->item_type?->value,
                'amount_idr' => $order->amount_idr,
                'status' => $order->status?->value,
                'created_at' => $order->created_at?->toIso8601String(),
            ])->values(),
            'meta' => [
                'total' => $orders->total(),
                'revenue_idr' => (int) Order::query()->where('status', OrderStatus::Paid)->sum('amount_idr'),
            ],
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $payments = PaymentTransaction::query()
            ->with('order:id,reference,company_id')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($payments->items())->map(fn (PaymentTransaction $payment) => [
                'id' => $payment->id,
                'order_reference' => $payment->order?->reference,
                'status' => $payment->status?->value,
                'amount_idr' => $payment->amount_idr,
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'created_at' => $payment->created_at?->toIso8601String(),
            ])->values(),
            'meta' => ['total' => $payments->total()],
        ]);
    }

    public function subscriptions(Request $request): JsonResponse
    {
        $subscriptions = CompanySubscription::query()
            ->with(['company:id,name,slug', 'plan:id,name,tier'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($subscriptions->items())->map(fn (CompanySubscription $row) => [
                'id' => $row->id,
                'company' => $row->company?->name,
                'plan' => $row->plan?->name,
                'tier' => $row->plan?->tier?->value,
                'status' => $row->status?->value,
                'starts_at' => $row->starts_at?->toIso8601String(),
                'ends_at' => $row->ends_at?->toIso8601String(),
                'jobs_posted_count' => $row->jobs_posted_count,
            ])->values(),
            'meta' => ['total' => $subscriptions->total()],
        ]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $logs = AuditLog::query()
            ->with('user:id,name')
            ->when($request->filled('action'), fn ($query) => $query->where('action', 'like', '%'.$request->string('action')->toString().'%'))
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 30, 100));

        return response()->json([
            'data' => collect($logs->items())->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'user' => $log->user?->name,
                'auditable_type' => $log->auditable_type ? class_basename($log->auditable_type) : null,
                'auditable_id' => $log->auditable_id,
                'created_at' => $log->created_at?->toIso8601String(),
            ])->values(),
            'meta' => ['total' => $logs->total()],
        ]);
    }
}
