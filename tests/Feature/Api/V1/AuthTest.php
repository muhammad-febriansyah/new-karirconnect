<?php

use App\Models\RefreshToken;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * Helper: log in and return the decoded token payload.
 *
 * @return array{access_token: string, refresh_token: string}
 */
function loginTokens(User $user, string $password = 'password'): array
{
    $response = test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => $password,
    ])->assertOk();

    return [
        'access_token' => $response->json('data.tokens.access_token'),
        'refresh_token' => $response->json('data.tokens.refresh_token'),
    ];
}

describe('login', function (): void {
    it('issues an access token and a refresh token', function (): void {
        $user = User::factory()->create(['password' => 'password']);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
            'device_name' => 'Pixel 8',
            'platform' => 'android',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.tokens.token_type', 'Bearer')
            ->assertJsonStructure([
                'data' => [
                    'user' => ['id', 'name', 'email', 'role'],
                    'tokens' => ['access_token', 'token_type', 'expires_in', 'refresh_token', 'refresh_expires_at'],
                ],
            ]);

        expect($response->json('data.tokens.refresh_token'))->toBeString();

        $this->assertDatabaseHas('refresh_tokens', [
            'user_id' => $user->id,
            'device_name' => 'Pixel 8',
            'platform' => 'android',
            'revoked_at' => null,
        ]);
    });

    it('never stores the refresh token in plaintext', function (): void {
        $user = User::factory()->create(['password' => 'password']);

        $plaintext = loginTokens($user)['refresh_token'];

        $this->assertDatabaseMissing('refresh_tokens', ['token_hash' => $plaintext]);
        $this->assertDatabaseHas('refresh_tokens', ['token_hash' => hash('sha256', $plaintext)]);
    });

    it('rejects a wrong password', function (): void {
        $user = User::factory()->create(['password' => 'password']);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])->assertStatus(401)->assertJsonPath('code', 'invalid_credentials');
    });

    it('gives an unknown email the same answer as a wrong password', function (): void {
        // Identical bodies, or the endpoint reveals which accounts exist.
        $user = User::factory()->create(['password' => 'password']);

        $wrongPassword = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email, 'password' => 'nope',
        ])->assertStatus(401);

        $unknownEmail = $this->postJson('/api/v1/auth/login', [
            'email' => 'ghost@example.test', 'password' => 'nope',
        ])->assertStatus(401);

        expect($unknownEmail->json())->toBe($wrongPassword->json());
    });

    it('refuses a suspended account and issues it no session', function (): void {
        $user = User::factory()->create(['password' => 'password', 'is_active' => false]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertStatus(403)->assertJsonPath('code', 'account_suspended');

        $this->assertDatabaseCount('refresh_tokens', 0);
    });
});

describe('authenticated requests', function (): void {
    it('returns the current user for a valid access token', function (): void {
        $user = User::factory()->create(['password' => 'password']);
        $tokens = loginTokens($user);

        $this->withHeader('Authorization', 'Bearer '.$tokens['access_token'])
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email);
    });

    it('rejects a request with no token as json, not a redirect', function (): void {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    });

    it('rejects a garbage token', function (): void {
        $this->withHeader('Authorization', 'Bearer not-a-real-token')
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    });

    it('never leaks the password hash or 2FA secret', function (): void {
        $user = User::factory()->create(['password' => 'password']);
        $tokens = loginTokens($user);

        $response = $this->withHeader('Authorization', 'Bearer '.$tokens['access_token'])
            ->getJson('/api/v1/auth/me')->assertOk();

        expect($response->json('data'))
            ->not->toHaveKey('password')
            ->not->toHaveKey('two_factor_secret')
            ->not->toHaveKey('two_factor_recovery_codes');
    });
});

describe('refresh rotation', function (): void {
    it('rotates: returns a new pair and spends the old token', function (): void {
        $user = User::factory()->create(['password' => 'password']);
        $tokens = loginTokens($user);

        $response = $this->postJson('/api/v1/auth/refresh', [
            'refresh_token' => $tokens['refresh_token'],
        ])->assertOk();

        $new = $response->json('data.tokens.refresh_token');

        expect($new)->not->toBe($tokens['refresh_token']);

        $old = RefreshToken::query()->where('token_hash', hash('sha256', $tokens['refresh_token']))->sole();
        expect($old->revoked_at)->not->toBeNull()
            ->and($old->replaced_by_id)->not->toBeNull();
    });

    it('rejects an unknown refresh token', function (): void {
        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => 'nonexistent'])
            ->assertStatus(401)
            ->assertJsonPath('code', 'refresh_token_invalid');
    });

    it('rejects an expired refresh token', function (): void {
        $user = User::factory()->create(['password' => 'password']);
        $tokens = loginTokens($user);

        RefreshToken::query()->where('user_id', $user->id)
            ->update(['expires_at' => now()->subDay()]);

        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tokens['refresh_token']])
            ->assertStatus(401);
    });

    it('lets a racing duplicate refresh replay the same answer', function (): void {
        // Two in-flight requests can legitimately redeem one token. Inside the
        // grace window the duplicate must get the same successor, not a logout.
        $user = User::factory()->create(['password' => 'password']);
        $tokens = loginTokens($user);

        $first = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tokens['refresh_token']])->assertOk();
        $second = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tokens['refresh_token']])->assertOk();

        expect($second->json('data.tokens.refresh_token'))
            ->toBe($first->json('data.tokens.refresh_token'));

        // The healthy session survives.
        $this->postJson('/api/v1/auth/refresh', [
            'refresh_token' => $first->json('data.tokens.refresh_token'),
        ])->assertOk();
    });

    it('treats replay after the grace window as theft and kills the chain', function (): void {
        $user = User::factory()->create(['password' => 'password']);
        $tokens = loginTokens($user);

        $first = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tokens['refresh_token']])->assertOk();
        $live = $first->json('data.tokens.refresh_token');

        // Grace is carried by a cache entry; dropping it is what expiry does.
        Cache::flush();

        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tokens['refresh_token']])
            ->assertStatus(401)
            ->assertJsonPath('code', 'refresh_token_invalid');

        // The token the attacker did NOT present must die too: we cannot tell
        // which party is legitimate, so both re-authenticate.
        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $live])->assertStatus(401);

        expect(RefreshToken::query()->where('user_id', $user->id)->whereNull('revoked_at')->count())
            ->toBe(0);
    });

    it('leaves sessions on other devices alone when a chain is revoked', function (): void {
        $user = User::factory()->create(['password' => 'password']);
        $phone = loginTokens($user);
        $tablet = loginTokens($user);

        $rotated = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $phone['refresh_token']])->assertOk();
        Cache::flush();

        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $phone['refresh_token']])->assertStatus(401);

        // The tablet was never part of the compromised chain.
        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tablet['refresh_token']])->assertOk();
    });

    it('refuses to refresh a suspended account', function (): void {
        $user = User::factory()->create(['password' => 'password']);
        $tokens = loginTokens($user);

        $user->update(['is_active' => false]);

        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tokens['refresh_token']])
            ->assertStatus(403)
            ->assertJsonPath('code', 'account_suspended');
    });
});

describe('logout', function (): void {
    it('revokes the refresh token so the session cannot be renewed', function (): void {
        $user = User::factory()->create(['password' => 'password']);
        $tokens = loginTokens($user);

        $this->withHeader('Authorization', 'Bearer '.$tokens['access_token'])
            ->postJson('/api/v1/auth/logout', ['refresh_token' => $tokens['refresh_token']])
            ->assertOk();

        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tokens['refresh_token']])
            ->assertStatus(401);
    });

    it('does not let a logged-out token be replayed within the grace window', function (): void {
        $user = User::factory()->create(['password' => 'password']);
        $tokens = loginTokens($user);

        $rotated = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tokens['refresh_token']])->assertOk();
        $live = $rotated->json('data.tokens.refresh_token');

        $this->withHeader('Authorization', 'Bearer '.$rotated->json('data.tokens.access_token'))
            ->postJson('/api/v1/auth/logout', ['refresh_token' => $live])
            ->assertOk();

        // The spent predecessor is still inside its grace window here; it must
        // not resurrect a session the user explicitly ended.
        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tokens['refresh_token']])
            ->assertStatus(401);
    });

    it('logs out every device', function (): void {
        $user = User::factory()->create(['password' => 'password']);
        $phone = loginTokens($user);
        $tablet = loginTokens($user);

        $this->withHeader('Authorization', 'Bearer '.$phone['access_token'])
            ->postJson('/api/v1/auth/logout-all')
            ->assertOk()
            ->assertJsonPath('data.revoked_sessions', 2);

        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $phone['refresh_token']])->assertStatus(401);
        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tablet['refresh_token']])->assertStatus(401);
    });
});

describe('register', function (): void {
    it('registers a jobseeker and signs them straight in', function (): void {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Budi Santoso',
            'email' => 'budi@example.test',
            'password' => 'Sup3rSecret!pass1',
            'password_confirmation' => 'Sup3rSecret!pass1',
            'role' => 'employee',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.role', 'employee');

        expect($response->json('data.tokens.access_token'))->toBeString();

        $this->assertDatabaseHas('users', ['email' => 'budi@example.test', 'role' => 'employee']);
    });

    it('registers an employer with a company', function (): void {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'HR Acme',
            'email' => 'hr@acme.test',
            'password' => 'Sup3rSecret!pass1',
            'password_confirmation' => 'Sup3rSecret!pass1',
            'role' => 'employer',
            'company_name' => 'Acme Indonesia',
        ])->assertCreated()->assertJsonPath('data.user.role', 'employer');

        $this->assertDatabaseHas('companies', ['name' => 'Acme Indonesia']);
    });

    it('refuses to let a visitor register themselves as an admin', function (): void {
        // Regression: the role rule accepted the whole UserRole enum, so
        // anyone could POST role=admin and mint an administrator.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Attacker',
            'email' => 'attacker@example.test',
            'password' => 'Sup3rSecret!pass1',
            'password_confirmation' => 'Sup3rSecret!pass1',
            'role' => 'admin',
        ])->assertStatus(422)->assertJsonValidationErrors('role');

        $this->assertDatabaseMissing('users', ['email' => 'attacker@example.test']);
    });

    it('rejects a duplicate email', function (): void {
        User::factory()->create(['email' => 'taken@example.test']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Someone',
            'email' => 'taken@example.test',
            'password' => 'Sup3rSecret!pass1',
            'password_confirmation' => 'Sup3rSecret!pass1',
            'role' => 'employee',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    });
});
