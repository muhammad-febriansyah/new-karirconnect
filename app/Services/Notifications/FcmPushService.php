<?php

namespace App\Services\Notifications;

use App\Models\User;
use App\Models\UserDeviceToken;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Exception\Messaging\NotFound;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FcmNotification;
use Kreait\Firebase\Messaging\WebPushConfig;
use Throwable;

/**
 * Wraps the Firebase Cloud Messaging SDK so the rest of the app can fire
 * notifications without coupling to Kreait. Falls back silently when
 * config is missing — local/dev environments should keep working without
 * Firebase credentials.
 */
class FcmPushService
{
    private ?Messaging $messaging = null;

    /**
     * @param  array<string, mixed>  $data
     */
    public function sendToUser(User $user, string $title, string $message, array $data = [], ?string $link = null): void
    {
        $tokens = UserDeviceToken::query()
            ->where('user_id', $user->id)
            ->pluck('token', 'id');

        if ($tokens->isEmpty()) {
            return;
        }

        $messaging = $this->messaging();

        if ($messaging === null) {
            return;
        }

        foreach ($tokens as $tokenId => $token) {
            $this->sendOne($messaging, (int) $tokenId, (string) $token, $title, $message, $data, $link);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function sendOne(Messaging $messaging, int $tokenId, string $token, string $title, string $message, array $data, ?string $link): void
    {
        $payload = $this->buildStringData($data, $link);

        $cloudMessage = CloudMessage::withTarget('token', $token)
            ->withNotification(FcmNotification::create($title, $message))
            ->withData($payload)
            ->withWebPushConfig(WebPushConfig::fromArray([
                'notification' => array_filter([
                    'title' => $title,
                    'body' => $message,
                    'icon' => '/favicon.ico',
                ]),
                'fcm_options' => array_filter([
                    'link' => $link,
                ]),
            ]));

        try {
            $messaging->send($cloudMessage);
            UserDeviceToken::query()->whereKey($tokenId)->update(['last_used_at' => now()]);
        } catch (NotFound) {
            UserDeviceToken::query()->whereKey($tokenId)->delete();
        } catch (Throwable $exception) {
            Log::warning('FcmPushService: failed to send notification', [
                'token_id' => $tokenId,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, string>
     */
    private function buildStringData(array $data, ?string $link): array
    {
        $payload = [];

        foreach ($data as $key => $value) {
            if ($value === null) {
                continue;
            }

            $payload[(string) $key] = is_scalar($value)
                ? (string) $value
                : (string) json_encode($value);
        }

        if ($link !== null && $link !== '') {
            $payload['click_action'] = $link;
            $payload['link'] = $link;
        }

        return $payload;
    }

    private function messaging(): ?Messaging
    {
        if ($this->messaging instanceof Messaging) {
            return $this->messaging;
        }

        $credentialsPath = (string) config('firebase.credentials');
        $projectId = (string) config('firebase.project_id');

        if ($credentialsPath === '' || $projectId === '') {
            Log::warning('FcmPushService: firebase config missing');

            return null;
        }

        $absolutePath = str_starts_with($credentialsPath, '/')
            ? $credentialsPath
            : base_path($credentialsPath);

        if (! file_exists($absolutePath)) {
            Log::warning('FcmPushService: credentials file not found', ['path' => $absolutePath]);

            return null;
        }

        try {
            $this->messaging = (new Factory)
                ->withServiceAccount($absolutePath)
                ->createMessaging();
        } catch (Throwable $exception) {
            Log::warning('FcmPushService: failed to initialise', [
                'message' => $exception->getMessage(),
            ]);

            return null;
        }

        return $this->messaging;
    }
}
