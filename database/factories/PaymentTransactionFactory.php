<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\PaymentTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PaymentTransaction>
 */
class PaymentTransactionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'provider' => 'midtrans',
            'gateway_reference' => null,
            'payment_method' => 'bank_transfer',
            'amount_idr' => 499000,
            'status' => 'pending',
        ];
    }
}
