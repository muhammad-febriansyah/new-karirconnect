<?php

namespace App\Services\Billing;

use App\Services\Billing\Clients\FakeMidtransClient;
use App\Services\Billing\Clients\MidtransClient;
use App\Services\Billing\Contracts\PaymentGatewayClient;
use Illuminate\Contracts\Foundation\Application;

/**
 * Resolves the payment gateway client. Tests bind FakeMidtransClient via the
 * container; production uses the real Midtrans client driven by Settings.
 */
class PaymentGatewayFactory
{
    public function __construct(private readonly Application $app) {}

    public function make(): PaymentGatewayClient
    {
        if ($this->app->bound('billing.gateway')) {
            return $this->app->make('billing.gateway');
        }

        return $this->app->environment('testing')
            ? $this->app->make(FakeMidtransClient::class)
            : $this->app->make(MidtransClient::class);
    }
}
