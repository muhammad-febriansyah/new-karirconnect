<?php

namespace App\Services\Auth;

use App\Enums\DevicePlatform;
use App\Exceptions\Auth\InvalidRefreshTokenException;
use App\Exceptions\Auth\RefreshTokenReusedException;
use App\Models\RefreshToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Issues and rotates refresh tokens for the mobile API.
 *
 * Access tokens are stateless JWTs, so nothing can invalidate one early. These
 * rows carry the revocation story instead: killing a session means killing its
 * refresh token, and the session then dies as soon as the current access token
 * expires (JWT_TTL, 15 minutes by default).
 *
 * Only the SHA-256 of each token is stored. The lookup has to be exact-match,
 * so a slow password hash is not an option here; the tokens are 64 characters
 * of CSPRNG output rather than user-chosen secrets, which is what makes a fast
 * digest acceptable. This mirrors how Sanctum stores its tokens.
 */
class RefreshTokenService
{
    /**
     * Cache prefix for the replay window. See rotate().
     */
    private const REPLAY_PREFIX = 'refresh-replay:';

    /**
     * Issue a fresh token for a new session (login).
     *
     * @return array{token: string, model: RefreshToken}
     */
    public function issue(User $user, ?Request $request = null): array
    {
        return $this->create($user, $request);
    }

    /**
     * Redeem a token and return its successor.
     *
     * Failures are reported by the transaction rather than thrown from inside
     * it. Reuse detection has to *write* -- it revokes the compromised chain --
     * and throwing through DB::transaction would roll that write back, leaving
     * the stolen chain alive while the response claimed otherwise. So the
     * closure commits and reports, and the throwing happens out here.
     *
     * @return array{token: string, model: RefreshToken, user: User}
     *
     * @throws InvalidRefreshTokenException
     * @throws RefreshTokenReusedException
     */
    public function rotate(string $plaintext, ?Request $request = null): array
    {
        $outcome = DB::transaction(function () use ($plaintext, $request): array {
            $hash = $this->hash($plaintext);

            // Lock the row: two concurrent refreshes must not both mint a
            // successor, or the loser's successor would be orphaned and the
            // client could end up holding a token the server forgot about.
            $current = RefreshToken::query()
                ->where('token_hash', $hash)
                ->lockForUpdate()
                ->first();

            if ($current === null) {
                return ['status' => 'invalid'];
            }

            if ($current->isRevoked()) {
                return $this->handleRevokedToken($current, $hash, $request);
            }

            if ($current->isExpired()) {
                return ['status' => 'invalid'];
            }

            $successor = $this->create($current->user, $request);

            $current->forceFill([
                'revoked_at' => now(),
                'replaced_by_id' => $successor['model']->id,
                'last_used_at' => now(),
            ])->save();

            // The successor's plaintext is not recoverable from its row, so a
            // client that legitimately redeems this token twice in flight could
            // not be answered from the database alone. Park the response for a
            // short window, keyed by the spent token, so the duplicate gets the
            // same answer instead of being mistaken for theft.
            $this->rememberForReplay($hash, $successor['token']);

            return [
                'status' => 'rotated',
                'token' => $successor['token'],
                'model' => $successor['model'],
                'user' => $current->user,
            ];
        });

        return match ($outcome['status']) {
            'invalid' => throw new InvalidRefreshTokenException,
            'reused' => throw new RefreshTokenReusedException($outcome['user_id']),
            default => [
                'token' => $outcome['token'],
                'model' => $outcome['model'],
                'user' => $outcome['user'],
            ],
        };
    }

    /**
     * Revoke a single token, e.g. on logout. Idempotent: an unknown or
     * already-revoked token is not an error, since the caller's intent
     * (this session should not continue) is satisfied either way.
     */
    public function revoke(string $plaintext): void
    {
        $hash = $this->hash($plaintext);

        // Drop the replay entry too, otherwise a logged-out token could still
        // be exchanged for its successor for the rest of the window.
        Cache::forget(self::REPLAY_PREFIX.$hash);

        RefreshToken::query()
            ->where('token_hash', $hash)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    /**
     * Revoke every live token for a user: "log out all devices", and the
     * response to a password change or a suspension.
     */
    public function revokeAllFor(User $user): int
    {
        return RefreshToken::query()
            ->where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    /**
     * A revoked token was presented. Either a benign in-flight duplicate or a
     * replay of a spent token.
     *
     * Reports an outcome instead of throwing so that the chain revocation below
     * survives the transaction. See rotate().
     *
     * @return array{status: string, user_id?: int, token?: string, model?: RefreshToken, user?: User}
     */
    private function handleRevokedToken(RefreshToken $current, string $hash, ?Request $request): array
    {
        // Revoked with no successor means it was deliberately killed (logout,
        // or a chain revocation). Nothing to hand back.
        if ($current->replaced_by_id === null) {
            return ['status' => 'invalid'];
        }

        $replayed = Cache::get(self::REPLAY_PREFIX.$hash);
        $successor = $current->replacedBy;

        // Inside the replay window, and the successor has not itself been
        // rotated yet: this is the same client asking twice. Repeat the answer.
        if (is_string($replayed) && $successor !== null && $successor->isUsable()) {
            return [
                'status' => 'rotated',
                'token' => $replayed,
                'model' => $successor,
                'user' => $current->user,
            ];
        }

        $this->revokeChain($current);

        Log::warning('Refresh token reuse detected; chain revoked.', [
            'user_id' => $current->user_id,
            'token_id' => $current->id,
            'ip' => $request?->ip(),
        ]);

        return ['status' => 'reused', 'user_id' => $current->user_id];
    }

    /**
     * Revoke the reused token's whole forward chain.
     *
     * Two parties hold the same token and there is no way to tell which is
     * which, so every descendant dies and both re-authenticate. Walks forward
     * rather than revoking by user_id so that unrelated sessions on the user's
     * other devices survive.
     */
    private function revokeChain(RefreshToken $from): void
    {
        $ids = [];
        $cursor = $from;
        $guard = 0;

        // The guard is a backstop against a cycle in replaced_by_id, which the
        // write path should never create.
        while ($cursor !== null && $guard++ < 100) {
            $ids[] = $cursor->id;
            Cache::forget(self::REPLAY_PREFIX.$cursor->token_hash);
            $cursor = $cursor->replaced_by_id !== null ? $cursor->replacedBy : null;
        }

        RefreshToken::query()
            ->whereIn('id', $ids)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    private function rememberForReplay(string $spentHash, string $successorPlaintext): void
    {
        $graceSeconds = (int) config('auth.refresh_tokens.grace_seconds');

        if ($graceSeconds > 0) {
            Cache::put(self::REPLAY_PREFIX.$spentHash, $successorPlaintext, $graceSeconds);
        }
    }

    /**
     * @return array{token: string, model: RefreshToken}
     */
    private function create(User $user, ?Request $request): array
    {
        $plaintext = Str::random(64);

        $model = RefreshToken::query()->create([
            'user_id' => $user->id,
            'token_hash' => $this->hash($plaintext),
            'device_name' => Str::limit((string) $request?->input('device_name'), 117) ?: null,
            'platform' => $this->resolvePlatform($request),
            'ip' => $request?->ip(),
            'user_agent' => Str::limit((string) $request?->userAgent(), 252) ?: null,
            'expires_at' => now()->addDays((int) config('auth.refresh_tokens.days')),
        ]);

        return ['token' => $plaintext, 'model' => $model];
    }

    private function resolvePlatform(?Request $request): ?DevicePlatform
    {
        $platform = $request?->input('platform');

        return is_string($platform)
            ? DevicePlatform::tryFrom($platform)
            : null;
    }

    private function hash(string $plaintext): string
    {
        return hash('sha256', $plaintext);
    }
}
