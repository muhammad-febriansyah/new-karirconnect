<?php

namespace App\Services\Billing;

use App\Enums\OrderItemType;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Job;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Single entry-point for paid actions. Handles order creation + gateway
 * hand-off, idempotent webhook processing, and entitlement application
 * (subscription activation, job boost). Keeping all of this in one service
 * means audit/refund logic only has to evolve in one place.
 */
class BillingService
{
    public function __construct(private readonly PaymentGatewayFactory $factory) {}

    /**
     * Start a checkout for a subscription plan. Creates an Order in `pending`,
     * asks the gateway for a redirect URL, persists the transaction, and
     * returns the URL. Caller redirects the user there.
     */
    public function checkoutPlan(Company $company, User $buyer, SubscriptionPlan $plan): Order
    {
        if (! $plan->is_active) {
            throw new RuntimeException('Plan is not currently available.');
        }

        return DB::transaction(function () use ($company, $buyer, $plan): Order {
            $order = Order::query()->create([
                'reference' => $this->generateReference('PLAN'),
                'company_id' => $company->id,
                'user_id' => $buyer->id,
                'item_type' => OrderItemType::SubscriptionPlan,
                'item_ref_id' => $plan->id,
                'description' => "Langganan paket {$plan->name}",
                'amount_idr' => $plan->price_idr,
                'quantity' => 1,
                'currency' => 'IDR',
                'status' => $plan->price_idr === 0 ? OrderStatus::Paid : OrderStatus::Pending,
                'payment_provider' => 'duitku',
                'expires_at' => now()->addHours(24),
                'metadata' => ['plan_slug' => $plan->slug, 'plan_tier' => $plan->tier->value],
            ]);

            if ($plan->price_idr === 0) {
                $order->forceFill(['paid_at' => now()])->save();
                $this->applyEntitlement($order->fresh());

                return $order->fresh();
            }

            $this->initiateGateway($order);

            return $order->fresh();
        });
    }

    /**
     * Buy a feature-job boost for one specific Job posting. Independent of any
     * active subscription so an Employer on Free can still boost ad-hoc.
     */
    public function checkoutJobBoost(Company $company, User $buyer, Job $job, int $priceIdr, int $days = 30): Order
    {
        if ($job->company_id !== $company->id) {
            throw new RuntimeException('Job does not belong to this company.');
        }

        return DB::transaction(function () use ($company, $buyer, $job, $priceIdr, $days): Order {
            $order = Order::query()->create([
                'reference' => $this->generateReference('BOOST'),
                'company_id' => $company->id,
                'user_id' => $buyer->id,
                'item_type' => OrderItemType::JobBoost,
                'item_ref_id' => $job->id,
                'description' => "Boost lowongan: {$job->title} ({$days} hari)",
                'amount_idr' => $priceIdr,
                'quantity' => 1,
                'currency' => 'IDR',
                'status' => OrderStatus::Pending,
                'payment_provider' => 'duitku',
                'expires_at' => now()->addHours(24),
                'metadata' => ['job_slug' => $job->slug, 'days' => $days],
            ]);

            $this->initiateGateway($order);

            return $order->fresh();
        });
    }

    /**
     * Webhook entry-point: verify signature, persist transaction, update order
     * status, and apply entitlement on success. Idempotent — replaying the
     * same callback doesn't double-apply.
     *
     * @param  array<string, mixed>  $payload
     */
    public function handleCallback(array $payload): Order
    {
        $client = $this->factory->make();

        if (! $client->verifyCallback($payload)) {
            throw new RuntimeException('Invalid callback signature.');
        }

        $reference = (string) ($payload['merchantOrderId'] ?? '');
        $order = Order::query()->where('reference', $reference)->firstOrFail();

        if ($order->status->isFinal() && $order->status !== OrderStatus::Pending) {
            return $order;
        }

        $status = $client->normalizeStatus($payload);

        return DB::transaction(function () use ($order, $payload, $client, $status): Order {
            PaymentTransaction::query()->create([
                'order_id' => $order->id,
                'provider' => $client->provider(),
                'gateway_reference' => (string) ($payload['reference'] ?? ''),
                'payment_method' => (string) ($payload['paymentCode'] ?? null),
                'amount_idr' => (int) ($payload['amount'] ?? $order->amount_idr),
                'status' => match ($status) {
                    'success' => PaymentStatus::Success,
                    'failed' => PaymentStatus::Failed,
                    'expired' => PaymentStatus::Expired,
                    default => PaymentStatus::Pending,
                },
                'signature' => (string) ($payload['signature'] ?? null),
                'callback_payload' => $payload,
                'settled_at' => $status === 'success' ? now() : null,
            ]);

            $newStatus = match ($status) {
                'success' => OrderStatus::Paid,
                'failed' => OrderStatus::Failed,
                'expired' => OrderStatus::Expired,
                default => $order->status,
            };

            $order->forceFill([
                'status' => $newStatus,
                'payment_reference' => (string) ($payload['reference'] ?? $order->payment_reference),
                'paid_at' => $newStatus === OrderStatus::Paid ? now() : $order->paid_at,
            ])->save();

            if ($newStatus === OrderStatus::Paid) {
                $this->applyEntitlement($order->fresh());
            }

            return $order->fresh();
        });
    }

    /**
     * Apply post-payment side-effects. Public so manual reconcile flows can
     * call it (e.g. admin marks an order paid out-of-band).
     */
    public function applyEntitlement(Order $order): void
    {
        match ($order->item_type) {
            OrderItemType::SubscriptionPlan => $this->activatePlan($order),
            OrderItemType::JobBoost => $this->boostJob($order),
            default => null,
        };
    }

    private function initiateGateway(Order $order): void
    {
        $client = $this->factory->make();
        $result = $client->createTransaction($order);

        PaymentTransaction::query()->create([
            'order_id' => $order->id,
            'provider' => $client->provider(),
            'gateway_reference' => $result['reference'] ?? null,
            'amount_idr' => $order->amount_idr,
            'status' => PaymentStatus::Pending,
            'request_payload' => $result['request'] ?? null,
            'response_payload' => $result['raw'] ?? null,
        ]);

        $order->forceFill([
            'status' => OrderStatus::AwaitingPayment,
            'payment_reference' => $result['reference'] ?? null,
            'payment_url' => $result['redirect_url'] ?? null,
        ])->save();
    }

    private function activatePlan(Order $order): void
    {
        $plan = SubscriptionPlan::query()->find($order->item_ref_id);
        if (! $plan) {
            return;
        }

        CompanySubscription::query()
            ->where('company_id', $order->company_id)
            ->where('status', SubscriptionStatus::Active)
            ->update([
                'status' => SubscriptionStatus::Cancelled,
                'cancelled_at' => now(),
            ]);

        CompanySubscription::query()->create([
            'company_id' => $order->company_id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now(),
            'ends_at' => now()->addDays($plan->billing_period_days),
            'jobs_posted_count' => 0,
            'featured_credits_remaining' => $plan->featured_credits,
            'ai_credits_remaining' => $plan->ai_interview_credits,
            'auto_renew' => false,
        ]);
    }

    private function boostJob(Order $order): void
    {
        $job = Job::query()->find($order->item_ref_id);
        if (! $job) {
            return;
        }

        $days = (int) ($order->metadata['days'] ?? 30);
        $existing = $job->featured_until && $job->featured_until->isFuture()
            ? $job->featured_until
            : now();

        $job->forceFill([
            'is_featured' => true,
            'featured_until' => $existing->copy()->addDays($days),
        ])->save();
    }

    private function generateReference(string $prefix): string
    {
        return $prefix.'-'.now()->format('YmdHis').'-'.Str::upper(Str::random(6));
    }
}
