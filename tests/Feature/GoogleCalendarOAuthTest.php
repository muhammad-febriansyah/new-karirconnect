<?php

use App\Models\GoogleCalendarToken;
use App\Models\User;
use App\Services\Settings\SettingService;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class]);
});

test('connect redirects to google when oauth credentials configured', function () {
    app(SettingService::class)->set('integrations', 'google_client_id', 'fake-client-id');
    app(SettingService::class)->set('integrations', 'google_client_secret', 'fake-secret');

    $employer = User::factory()->employer()->create();

    $response = $this->actingAs($employer)
        ->get(route('employer.google-calendar.connect'));

    $response->assertRedirect();
    expect($response->headers->get('Location'))->toContain('accounts.google.com/o/oauth2/v2/auth');
    expect($response->headers->get('Location'))->toContain('client_id=fake-client-id');
});

test('connect shows error when oauth not configured', function () {
    app(SettingService::class)->set('integrations', 'google_client_id', '');
    app(SettingService::class)->set('integrations', 'google_client_secret', '');

    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)
        ->from(route('employer.interviews.index'))
        ->get(route('employer.google-calendar.connect'))
        ->assertSessionHasErrors('google');
});

test('callback rejects invalid state', function () {
    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)
        ->withSession(['google_oauth_state' => 'expected-state'])
        ->get(route('employer.google-calendar.callback', ['state' => 'wrong-state', 'code' => 'abc']))
        ->assertSessionHasErrors('google');

    expect(GoogleCalendarToken::query()->count())->toBe(0);
});

test('callback exchanges code for token and persists encrypted', function () {
    app(SettingService::class)->set('integrations', 'google_client_id', 'fake-client-id');
    app(SettingService::class)->set('integrations', 'google_client_secret', 'fake-secret');

    Http::fake([
        'oauth2.googleapis.com/token' => Http::response([
            'access_token' => 'access-xyz',
            'refresh_token' => 'refresh-xyz',
            'expires_in' => 3600,
        ], 200),
        'www.googleapis.com/oauth2/v2/userinfo' => Http::response(['email' => 'recruiter@example.com'], 200),
    ]);

    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)
        ->withSession(['google_oauth_state' => 'state-123'])
        ->get(route('employer.google-calendar.callback', ['state' => 'state-123', 'code' => 'auth-code']))
        ->assertRedirect(route('employer.interviews.index'));

    $token = GoogleCalendarToken::query()->where('user_id', $employer->id)->firstOrFail();
    expect($token->calendar_email)->toBe('recruiter@example.com');
    expect(Crypt::decryptString($token->access_token))->toBe('access-xyz');
    expect(Crypt::decryptString($token->refresh_token))->toBe('refresh-xyz');
});

test('disconnect removes token row', function () {
    $employer = User::factory()->employer()->create();
    GoogleCalendarToken::query()->create([
        'user_id' => $employer->id,
        'calendar_email' => 'r@example.com',
        'access_token' => Crypt::encryptString('a'),
        'expires_at' => now()->addHour(),
        'scopes' => ['x'],
    ]);

    $this->actingAs($employer)
        ->delete(route('employer.google-calendar.disconnect'))
        ->assertRedirect(route('employer.interviews.index'));

    expect(GoogleCalendarToken::query()->count())->toBe(0);
});
