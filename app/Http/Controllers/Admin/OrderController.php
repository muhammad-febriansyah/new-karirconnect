<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->input('status');
        $statusEnum = $status ? OrderStatus::tryFrom($status) : null;

        $query = Order::query()
            ->with(['company:id,name,slug', 'user:id,name,email'])
            ->latest('id');

        if ($statusEnum) {
            $query->where('status', $statusEnum);
        }
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('reference', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%')
                    ->orWhereHas('company', fn ($c) => $c->where('name', 'like', '%'.$search.'%'));
            });
        }

        $orders = $query->paginate(20)->withQueryString();

        $totals = [
            'total_count' => Order::query()->count(),
            'paid_count' => Order::query()->where('status', OrderStatus::Paid)->count(),
            'paid_amount' => (int) Order::query()->where('status', OrderStatus::Paid)->sum('amount_idr'),
            'awaiting_count' => Order::query()->where('status', OrderStatus::AwaitingPayment)->count(),
        ];

        return Inertia::render('admin/orders/index', [
            'filters' => ['status' => $status, 'search' => $search],
            'totals' => $totals,
            'orders' => $orders->through(fn (Order $o) => [
                'reference' => $o->reference,
                'company_name' => $o->company?->name,
                'company_slug' => $o->company?->slug,
                'user_name' => $o->user?->name,
                'user_email' => $o->user?->email,
                'description' => $o->description,
                'amount_idr' => $o->amount_idr,
                'item_type' => $o->item_type->value,
                'status' => $o->status->value,
                'payment_provider' => $o->payment_provider,
                'payment_reference' => $o->payment_reference,
                'paid_at' => optional($o->paid_at)->toIso8601String(),
                'created_at' => optional($o->created_at)->toIso8601String(),
            ]),
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        $order->load(['company:id,name,slug', 'user:id,name,email', 'transactions']);

        return Inertia::render('admin/orders/show', [
            'order' => [
                'reference' => $order->reference,
                'company_name' => $order->company?->name,
                'user_name' => $order->user?->name,
                'user_email' => $order->user?->email,
                'description' => $order->description,
                'amount_idr' => $order->amount_idr,
                'currency' => $order->currency,
                'status' => $order->status->value,
                'item_type' => $order->item_type->value,
                'payment_provider' => $order->payment_provider,
                'payment_reference' => $order->payment_reference,
                'metadata' => $order->metadata,
                'paid_at' => optional($order->paid_at)->toIso8601String(),
                'expires_at' => optional($order->expires_at)->toIso8601String(),
                'created_at' => optional($order->created_at)->toIso8601String(),
            ],
            'transactions' => $order->transactions->map(fn ($t) => [
                'provider' => $t->provider,
                'gateway_reference' => $t->gateway_reference,
                'payment_method' => $t->payment_method,
                'amount_idr' => $t->amount_idr,
                'status' => $t->status?->value,
                'settled_at' => optional($t->settled_at)->toIso8601String(),
                'created_at' => optional($t->created_at)->toIso8601String(),
            ])->values(),
        ]);
    }
}
