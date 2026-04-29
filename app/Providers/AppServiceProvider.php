<?php

namespace App\Providers;

use App\Models\Job;
use App\Observers\JobObserver;
use App\Services\Ai\Clients\FakeAiClient;
use App\Services\Ai\Contracts\AiClient;
use App\Services\Billing\Clients\FakeDuitkuClient;
use App\Services\Billing\Contracts\PaymentGatewayClient;
use App\Services\Settings\SettingService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SettingService::class);

        // Default to the deterministic fake AI client during testing so feature
        // tests never hit the network. Production resolves OpenAiClient via
        // AiClientFactory based on the `ai.provider` setting.
        if ($this->app->environment('testing')) {
            $this->app->singleton('ai.client', fn () => new FakeAiClient);
            $this->app->singleton(AiClient::class, fn ($app) => $app->make('ai.client'));

            $this->app->singleton('billing.gateway', fn () => new FakeDuitkuClient);
            $this->app->singleton(PaymentGatewayClient::class, fn ($app) => $app->make('billing.gateway'));
        }
    }

    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureModels();
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    protected function configureModels(): void
    {
        Model::shouldBeStrict(! app()->isProduction());
        Model::preventLazyLoading(! app()->isProduction());
        Job::observe(JobObserver::class);
    }
}
