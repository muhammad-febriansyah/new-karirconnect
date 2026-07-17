<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Fortify\CreateNewUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Requests\Api\V1\Auth\RefreshRequest;
use App\Http\Requests\Api\V1\Auth\RegisterRequest;
use App\Http\Resources\Api\V1\UserResource;
use App\Models\RefreshToken;
use App\Models\User;
use App\Services\Auth\RefreshTokenService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

/**
 * Token authentication for the Flutter client.
 *
 * The access token is a JWT and is intentionally short-lived: nothing can
 * revoke one before it expires. Every revocation story (logout, log out all
 * devices, reuse detection) is therefore told through the refresh token, and a
 * killed session survives only until its current access token runs out.
 */
class AuthController extends Controller
{
    public function __construct(private readonly RefreshTokenService $refreshTokens) {}

    /**
     * Register and sign in, so the app does not have to bounce to login.
     *
     * Delegates to the same action the web registration uses, which also
     * provisions a pending Company when role=employer.
     */
    public function register(RegisterRequest $request, CreateNewUser $creator): JsonResponse
    {
        // Reloaded before anything reads it. CreateNewUser inserts without
        // is_active, so the column takes its database default while the
        // in-memory model still has no such attribute -- it would read as null,
        // and both the JWT is_active claim and the user payload would tell a
        // brand new account it was suspended.
        $user = $creator->create($request->all())->refresh();

        event(new Registered($user));

        $token = Auth::guard('api')->login($user);

        return $this->tokenResponse($user, $token, $request, status: 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        $token = Auth::guard('api')->attempt($credentials);

        if ($token === false) {
            // Same response for unknown email and wrong password: telling them
            // apart would turn this into an account-enumeration oracle.
            return response()->json([
                'message' => 'Email atau kata sandi salah.',
                'code' => 'invalid_credentials',
            ], 401);
        }

        /** @var User $user */
        $user = Auth::guard('api')->user();

        if (! $user->is_active) {
            // Drop the token that attempt() just minted; a suspended account
            // must not walk away holding a valid 15-minute credential.
            Auth::guard('api')->logout();

            return response()->json([
                'message' => 'Akun Anda dinonaktifkan. Hubungi dukungan.',
                'code' => 'account_suspended',
            ], 403);
        }

        return $this->tokenResponse($user, $token, $request);
    }

    /**
     * Exchange a refresh token for a new access token and a new refresh token.
     *
     * Failures surface as 401 via the handlers registered in bootstrap/app.php.
     */
    public function refresh(RefreshRequest $request): JsonResponse
    {
        $rotated = $this->refreshTokens->rotate($request->string('refresh_token')->toString(), $request);

        /** @var User $user */
        $user = $rotated['user'];

        if (! $user->is_active) {
            $this->refreshTokens->revokeAllFor($user);

            return response()->json([
                'message' => 'Akun Anda dinonaktifkan. Hubungi dukungan.',
                'code' => 'account_suspended',
            ], 403);
        }

        $accessToken = Auth::guard('api')->login($user);

        return $this->tokenResponse($user, $accessToken, $request, refreshToken: $rotated['token'], refreshModel: $rotated['model']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()),
        ]);
    }

    /**
     * End this session only. Other devices keep working.
     */
    public function logout(Request $request): JsonResponse
    {
        if ($request->filled('refresh_token')) {
            $this->refreshTokens->revoke($request->string('refresh_token')->toString());
        }

        $this->invalidateCurrentAccessToken();

        return response()->json(['message' => 'Berhasil keluar.']);
    }

    /**
     * End every session for this user.
     *
     * Access tokens already issued to other devices are JWTs and cannot be
     * recalled, so those devices stay usable until their token expires
     * (JWT_TTL). They cannot renew, because every refresh token is now dead.
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $revoked = $this->refreshTokens->revokeAllFor($request->user());

        $this->invalidateCurrentAccessToken();

        return response()->json([
            'message' => 'Berhasil keluar dari semua perangkat.',
            'data' => ['revoked_sessions' => $revoked],
        ]);
    }

    /**
     * Blacklist the presented JWT so it dies now rather than at expiry.
     *
     * Best-effort: if the token is already gone or unparseable the user is
     * logged out anyway, which is what they asked for.
     */
    private function invalidateCurrentAccessToken(): void
    {
        try {
            JWTAuth::invalidate(JWTAuth::getToken());
        } catch (JWTException) {
            // Nothing to invalidate.
        }
    }

    private function tokenResponse(
        User $user,
        string $accessToken,
        Request $request,
        int $status = 200,
        ?string $refreshToken = null,
        ?RefreshToken $refreshModel = null,
    ): JsonResponse {
        if ($refreshToken === null) {
            $issued = $this->refreshTokens->issue($user, $request);
            $refreshToken = $issued['token'];
            $refreshModel = $issued['model'];
        }

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'tokens' => [
                    'access_token' => $accessToken,
                    'token_type' => 'Bearer',
                    'expires_in' => Auth::guard('api')->factory()->getTTL() * 60,
                    'refresh_token' => $refreshToken,
                    'refresh_expires_at' => $refreshModel?->expires_at->toIso8601String(),
                ],
            ],
        ], $status);
    }
}
