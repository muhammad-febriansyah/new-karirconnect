<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\PaymentTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function index(Request $request): Response
    {
        $statusFilter = $request->string('status')->toString();
        $search = $request->string('search')->toString();

        $payments = PaymentTransaction::query()
            ->with(['order:id,reference,company_id', 'order.company:id,name,logo_path'])
            ->when($statusFilter !== '', fn ($q) => $q->where('status', $statusFilter))
            ->when($search !== '', function ($q) use ($search): void {
                $q->whereHas('order', fn ($oq) => $oq
                    ->where('reference', 'like', "%{$search}%")
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', 'like', "%{$search}%")));
            })
            ->latest('created_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (PaymentTransaction $t) => [
                'id' => $t->id,
                'gateway_reference' => $t->gateway_reference,
                'provider' => $t->provider,
                'payment_method' => $t->payment_method,
                'amount_idr' => $t->amount_idr,
                'status' => $t->status?->value,
                'settled_at' => optional($t->settled_at)->toIso8601String(),
                'created_at' => optional($t->created_at)->toIso8601String(),
                'order' => $t->order ? [
                    'id' => $t->order->id,
                    'merchant_order_id' => $t->order->reference,
                    'company' => $t->order->company ? [
                        'id' => $t->order->company->id,
                        'name' => $t->order->company->name,
                        'logo_url' => $t->order->company->logo_path ? asset('storage/'.$t->order->company->logo_path) : null,
                    ] : null,
                ] : null,
            ]);

        return Inertia::render('admin/payments/index', [
            'payments' => $payments,
            'filters' => ['status' => $statusFilter, 'search' => $search],
            'statusOptions' => array_map(
                fn (PaymentStatus $s) => ['value' => $s->value, 'label' => ucfirst($s->value)],
                PaymentStatus::cases(),
            ),
            'totals' => [
                'total' => PaymentTransaction::query()->count(),
                'success' => PaymentTransaction::query()->where('status', PaymentStatus::Success)->count(),
                'failed' => PaymentTransaction::query()->where('status', PaymentStatus::Failed)->count(),
                'gross_idr' => (int) PaymentTransaction::query()->where('status', PaymentStatus::Success)->sum('amount_idr'),
            ],
        ]);
    }
}
