<?php

namespace App\Providers;

use App\Mail\Transport\MailketingTransport;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\User;
use App\Notifications\Channels\FcmChannel;
use App\Observers\EmployeeProfileObserver;
use App\Observers\JobObserver;
use App\Services\Ai\Clients\FakeAiClient;
use App\Services\Ai\Contracts\AiClient;
use App\Services\Billing\Clients\FakeDuitkuClient;
use App\Services\Billing\Contracts\PaymentGatewayClient;
use App\Services\Settings\SettingService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\ChannelManager;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
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
        $this->configureMail();
        $this->configureGates();
        $this->configureNotificationChannels();
    }

    /**
     * Register custom 'fcm' channel so any Notification listing 'fcm' in via()
     * automatically delivers to Firebase Cloud Messaging via FcmPushService.
     */
    protected function configureNotificationChannels(): void
    {
        Notification::resolved(function (ChannelManager $manager): void {
            $manager->extend('fcm', fn ($app) => $app->make(FcmChannel::class));
        });
    }

    /**
     * Blueprint §13: register the role-access gates and dynamic `feature.*` gate.
     * Frontend already reads `auth.user.role` and `features.*` from shared props;
     * these gates give backend the same vocabulary so controllers/middleware can
     * authorize() against them without duplicating role/flag logic.
     */
    protected function configureGates(): void
    {
        Gate::define('access-admin', fn (User $user) => $user->isAdmin());
        Gate::define('access-employer', fn (User $user) => $user->isEmployer() || $user->isAdmin());
        Gate::define('access-employee', fn (User $user) => $user->isEmployee() || $user->isAdmin());

        // Dynamic feature flag gate. Usage: Gate::allows('feature', 'ai_coach_enabled').
        // Reads from settings.feature_flags so admins can flip without redeploy.
        Gate::define('feature', function (?User $user, string $flag): bool {
            try {
                $value = app(SettingService::class)->get("feature_flags.{$flag}");

                return (bool) $value;
            } catch (\Throwable) {
                return false;
            }
        });
    }

    protected function configureMail(): void
    {
        Mail::extend('mailketing', function (array $config) {
            $token = (string) ($config['api_token'] ?? '');

            return new MailketingTransport($token);
        });

        if ($this->app->runningInConsole() && $this->app->runningUnitTests()) {
            return;
        }

        try {
            $email = app(SettingService::class)->group('email');
        } catch (\Throwable) {
            return;
        }

        $driver = (string) ($email['mail_driver'] ?? '');
        $fromAddress = (string) ($email['mail_from_address'] ?? '');
        $fromName = (string) ($email['mail_from_name'] ?? '');
        $token = (string) ($email['mailketing_api_token'] ?? '');

        if ($fromAddress !== '') {
            config(['mail.from.address' => $fromAddress]);
        }

        if ($fromName !== '') {
            config(['mail.from.name' => $fromName]);
        }

        if ($driver === 'mailketing' && $token !== '') {
            config([
                'mail.default' => 'mailketing',
                'mail.mailers.mailketing.api_token' => $token,
            ]);
        } elseif ($driver !== '') {
            config(['mail.default' => $driver]);
        }
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
        EmployeeProfile::observe(EmployeeProfileObserver::class);
    }
}
