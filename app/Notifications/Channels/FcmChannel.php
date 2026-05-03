<?php

namespace App\Notifications\Channels;

use App\Models\User;
use App\Services\Notifications\FcmPushService;
use Illuminate\Notifications\Notification;

/**
 * Bridges Laravel's notification system to FCM browser push so any
 * Notification class can fan-out to the bell (database), email (mail),
 * and the device (this channel) by listing 'fcm' in its via() array.
 *
 * Notifications can opt into a richer payload by implementing toFcm()
 * which returns ['title', 'body', 'data', 'link']. Otherwise we derive
 * those from toArray() — the same payload used by the database channel.
 */
class FcmChannel
{
    public function __construct(private readonly FcmPushService $push) {}

    public function send(object $notifiable, Notification $notification): void
    {
        if (! $notifiable instanceof User) {
            return;
        }

        $payload = $this->extractPayload($notifiable, $notification);

        if ($payload['title'] === '' || $payload['body'] === '') {
            return;
        }

        $this->push->sendToUser(
            $notifiable,
            $payload['title'],
            $payload['body'],
            $payload['data'],
            $payload['link'],
        );
    }

    /**
     * @return array{title: string, body: string, data: array<string, mixed>, link: ?string}
     */
    private function extractPayload(User $user, Notification $notification): array
    {
        if (method_exists($notification, 'toFcm')) {
            $custom = $notification->toFcm($user);

            return [
                'title' => (string) ($custom['title'] ?? ''),
                'body' => (string) ($custom['body'] ?? ''),
                'data' => is_array($custom['data'] ?? null) ? $custom['data'] : [],
                'link' => $custom['link'] ?? null,
            ];
        }

        if (method_exists($notification, 'toArray')) {
            $array = $notification->toArray($user);

            return [
                'title' => (string) ($array['title'] ?? ''),
                'body' => (string) ($array['body'] ?? $array['message'] ?? ''),
                'data' => array_filter([
                    'notification_id' => $array['id'] ?? null,
                    'icon' => $array['icon'] ?? null,
                ], fn ($v) => $v !== null),
                'link' => $array['action_url'] ?? $array['url'] ?? null,
            ];
        }

        return ['title' => '', 'body' => '', 'data' => [], 'link' => null];
    }
}
