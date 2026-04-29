<?php

namespace App\Services\Billing;

use App\Services\Billing\Clients\DuitkuClient;
use App\Services\Billing\Clients\FakeDuitkuClient;
use App\Services\Billing\Contracts\PaymentGatewayClient;
use Illuminate\Contracts\Foundation\Application;

/**
 * Resolves the payment gateway client. Tests bind FakeDuitkuClient via the
 * container; production uses the real Duitku client driven by Settings.
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
            ? $this->app->make(FakeDuitkuClient::class)
            : $this->app->make(DuitkuClient::class);
    }
}
