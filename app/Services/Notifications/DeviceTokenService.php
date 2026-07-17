<?php

namespace App\Services\Notifications;

use App\Enums\DevicePlatform;
use App\Models\User;
use App\Models\UserDeviceToken;
use Illuminate\Support\Collection;

/**
 * Manage device tokens used for push notifications (web push, FCM Android/iOS).
 * Actual delivery integration is wired separately once the FCM server key
 * is configured in settings (group=notifications, key=fcm_server_key).
 */
class DeviceTokenService
{
    public function register(User $user, DevicePlatform $platform, string $token, ?string $deviceName = null, ?string $appVersion = null): UserDeviceToken
    {
        return UserDeviceToken::query()->updateOrCreate(
            ['token' => $token],
            [
                'user_id' => $user->id,
                'platform' => $platform,
                'device_name' => $deviceName,
                'app_version' => $appVersion,
                'last_used_at' => now(),
            ],
        );
    }

    /**
     * Revoke a token belonging to a specific user.
     *
     * Callers handling a request must use this rather than revoke(): the token
     * arrives in the request body, and deleting purely by token value lets any
     * authenticated caller unregister someone else's device -- silently killing
     * that person's push notifications -- if they ever learn the token string.
     */
    public function revokeFor(User $user, string $token): void
    {
        UserDeviceToken::query()
            ->where('user_id', $user->id)
            ->where('token', $token)
            ->delete();
    }

    /**
     * Revoke a token regardless of owner.
     *
     * Only for trusted server-side callers, e.g. pruning a token FCM has
     * reported as permanently unregistered. Never call this with a token that
     * came from a request body.
     */
    public function revoke(string $token): void
    {
        UserDeviceToken::query()->where('token', $token)->delete();
    }

    public function revokeAllFor(User $user): void
    {
        UserDeviceToken::query()->where('user_id', $user->id)->delete();
    }

    public function touch(string $token): void
    {
        UserDeviceToken::query()
            ->where('token', $token)
            ->update(['last_used_at' => now()]);
    }

    /**
     * @return Collection<int, UserDeviceToken>
     */
    public function tokensFor(User $user, ?DevicePlatform $platform = null): Collection
    {
        return UserDeviceToken::query()
            ->where('user_id', $user->id)
            ->when($platform, fn ($query) => $query->where('platform', $platform))
            ->get();
    }
}
