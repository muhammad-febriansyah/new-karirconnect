<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reference' => 'ORD-'.strtoupper(Str::random(12)),
            'company_id' => Company::factory(),
            'user_id' => User::factory()->employer(),
            'item_type' => 'subscription_plan',
            'item_ref_id' => null,
            'description' => 'Subscription plan',
            'amount_idr' => 499000,
            'quantity' => 1,
            'currency' => 'IDR',
            'status' => 'pending',
            'payment_provider' => 'duitku',
            'expires_at' => now()->addHours(24),
        ];
    }

    public function paid(): self
    {
        return $this->state(fn () => [
            'status' => 'paid',
            'paid_at' => now(),
            'payment_reference' => 'TRX-'.strtoupper(Str::random(10)),
        ]);
    }
}
