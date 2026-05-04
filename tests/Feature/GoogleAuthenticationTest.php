<?php

use App\Enums\UserRole;
use App\Models\User;
use App\Services\Settings\SettingService;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class]);
});

test('google login redirect points to google when oauth is configured', function () {
    app(SettingService::class)->set('integrations', 'google_client_id', 'fake-client-id');
    app(SettingService::class)->set('integrations', 'google_client_secret', 'fake-secret');

    $response = $this->get(route('auth.google.login'));

    $response->assertRedirect();
    expect($response->headers->get('Location'))->toContain('accounts.google.com/o/oauth2/v2/auth');
    expect($response->headers->get('Location'))->toContain('client_id=fake-client-id');
});

test('google login callback authenticates existing users', function () {
    app(SettingService::class)->set('integrations', 'google_client_id', 'fake-client-id');
    app(SettingService::class)->set('integrations', 'google_client_secret', 'fake-secret');

    Http::fake([
        'oauth2.googleapis.com/token' => Http::response([
            'access_token' => 'google-access-token',
        ], 200),
        'www.googleapis.com/oauth2/v2/userinfo' => Http::response([
            'email' => 'existing@example.com',
            'name' => 'Existing User',
        ], 200),
    ]);

    $user = User::factory()->unverified()->create([
        'email' => 'existing@example.com',
        'role' => UserRole::Employer,
    ]);

    $this->withSession([
        'google_auth' => [
            'state' => 'expected-state',
            'intent' => 'login',
            'role' => null,
        ],
    ])->get(route('auth.google.callback', [
        'state' => 'expected-state',
        'code' => 'auth-code',
    ]))
        ->assertRedirect(route('dashboard'));

    $this->assertAuthenticatedAs($user->fresh());
    expect($user->fresh()->email_verified_at)->not->toBeNull();
});

test('google login callback rejects unknown accounts', function () {
    app(SettingService::class)->set('integrations', 'google_client_id', 'fake-client-id');
    app(SettingService::class)->set('integrations', 'google_client_secret', 'fake-secret');

    Http::fake([
        'oauth2.googleapis.com/token' => Http::response([
            'access_token' => 'google-access-token',
        ], 200),
        'www.googleapis.com/oauth2/v2/userinfo' => Http::response([
            'email' => 'new-user@example.com',
            'name' => 'New User',
        ], 200),
    ]);

    $this->withSession([
        'google_auth' => [
            'state' => 'expected-state',
            'intent' => 'login',
            'role' => null,
        ],
    ])->get(route('auth.google.callback', [
        'state' => 'expected-state',
        'code' => 'auth-code',
    ]))
        ->assertRedirect(route('login'))
        ->assertSessionHas('error');

    $this->assertGuest();
});

test('google register callback creates a new jobseeker account', function () {
    app(SettingService::class)->set('integrations', 'google_client_id', 'fake-client-id');
    app(SettingService::class)->set('integrations', 'google_client_secret', 'fake-secret');

    Http::fake([
        'oauth2.googleapis.com/token' => Http::response([
            'access_token' => 'google-access-token',
        ], 200),
        'www.googleapis.com/oauth2/v2/userinfo' => Http::response([
            'email' => 'jobseeker@example.com',
            'name' => 'Job Seeker',
        ], 200),
    ]);

    $this->withSession([
        'google_auth' => [
            'state' => 'register-state',
            'intent' => 'register',
            'role' => UserRole::Employee->value,
        ],
    ])->get(route('auth.google.callback', [
        'state' => 'register-state',
        'code' => 'auth-code',
    ]))
        ->assertRedirect(route('dashboard'));

    $user = User::query()->where('email', 'jobseeker@example.com')->firstOrFail();
    expect($user->role)->toBe(UserRole::Employee);
    $this->assertAuthenticatedAs($user);
});

test('google register callback creates a new company account', function () {
    app(SettingService::class)->set('integrations', 'google_client_id', 'fake-client-id');
    app(SettingService::class)->set('integrations', 'google_client_secret', 'fake-secret');

    Http::fake([
        'oauth2.googleapis.com/token' => Http::response([
            'access_token' => 'google-access-token',
        ], 200),
        'www.googleapis.com/oauth2/v2/userinfo' => Http::response([
            'email' => 'company@example.com',
            'name' => 'Company Owner',
        ], 200),
    ]);

    $this->withSession([
        'google_auth' => [
            'state' => 'register-state',
            'intent' => 'register',
            'role' => UserRole::Employer->value,
        ],
    ])->get(route('auth.google.callback', [
        'state' => 'register-state',
        'code' => 'auth-code',
    ]))
        ->assertRedirect(route('dashboard'));

    $user = User::query()->where('email', 'company@example.com')->firstOrFail();
    expect($user->role)->toBe(UserRole::Employer);
    $this->assertAuthenticatedAs($user);
});

test('google callback rejects invalid state', function () {
    $this->withSession([
        'google_auth' => [
            'state' => 'expected-state',
            'intent' => 'login',
            'role' => null,
        ],
    ])->get(route('auth.google.callback', [
        'state' => 'wrong-state',
        'code' => 'auth-code',
    ]))
        ->assertRedirect(route('login'))
        ->assertSessionHas('error');
});
