<?php

use App\Exceptions\Auth\InvalidRefreshTokenException;
use App\Exceptions\Auth\RefreshTokenReusedException;
use App\Http\Middleware\EnsureCompanyApproved;
use App\Http\Middleware\EnsureEmployerOnboarded;
use App\Http\Middleware\EnsureFeatureEnabled;
use App\Http\Middleware\EnsureOnboardingCompleted;
use App\Http\Middleware\EnsureSubscriptionActive;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: '',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['sidebar_state']);

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
            'company.approved' => EnsureCompanyApproved::class,
            'subscription.active' => EnsureSubscriptionActive::class,
            'feature' => EnsureFeatureEnabled::class,
            'onboarding' => EnsureOnboardingCompleted::class,
            'employer.onboarded' => EnsureEmployerOnboarded::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        /*
         * The mobile API must never answer with an Inertia page or a redirect
         * to /login, regardless of what the client sent in its Accept header.
         */
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );

        /*
         * A dead refresh token is a 401 whether it was unknown, expired, spent,
         * or just revoked as part of a stolen chain. Collapsing them to one
         * response keeps the API from confirming which tokens exist; the reuse
         * case is logged server-side in RefreshTokenService.
         */
        $exceptions->render(function (InvalidRefreshTokenException|RefreshTokenReusedException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'The refresh token is invalid or has expired.',
                    'code' => 'refresh_token_invalid',
                ], 401);
            }

            return null;
        });
    })->create();
