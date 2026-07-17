<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\DevicePlatform;
use App\Http\Controllers\Controller;
use App\Services\Notifications\DeviceTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Validation\Rule;

/**
 * Notification inbox and push-token registration.
 *
 * The payload shape mirrors the web NotificationController::present() so both
 * clients read the same keys.
 */
class NotificationController extends Controller
{
    public function __construct(private readonly DeviceTokenService $tokens) {}

    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->when($request->boolean('unread_only'), fn ($query) => $query->whereNull('read_at'))
            ->paginate(min($request->integer('per_page') ?: 20, 50))
            ->withQueryString()
            ->through(fn (DatabaseNotification $n) => $this->present($n));

        return response()->json([
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'total' => $notifications->total(),
                'unread_count' => $request->user()->unreadNotifications()->count(),
            ],
        ]);
    }

    /**
     * Badge count plus a short preview, for the app's bell icon.
     */
    public function unread(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'count' => $user->unreadNotifications()->count(),
                'recent' => $user->unreadNotifications()
                    ->latest()
                    ->limit(5)
                    ->get()
                    ->map(fn (DatabaseNotification $n) => $this->present($n))
                    ->values(),
            ],
        ]);
    }

    public function markRead(Request $request, string $notification): JsonResponse
    {
        // Scoped through the user, so another user's id is a 404 rather than a
        // successful write.
        $record = $request->user()->notifications()->where('id', $notification)->firstOrFail();

        $record->markAsRead();

        return response()->json(['message' => 'Notifikasi ditandai dibaca.']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['message' => 'Semua notifikasi ditandai dibaca.']);
    }

    public function destroy(Request $request, string $notification): JsonResponse
    {
        $record = $request->user()->notifications()->where('id', $notification)->firstOrFail();

        $record->delete();

        return response()->json(['message' => 'Notifikasi dihapus.']);
    }

    /**
     * Register an FCM token for this device.
     */
    public function storeDeviceToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:512'],
            'platform' => ['nullable', Rule::enum(DevicePlatform::class)],
            'device_name' => ['nullable', 'string', 'max:160'],
            'app_version' => ['nullable', 'string', 'max:32'],
        ]);

        $this->tokens->register(
            $request->user(),
            DevicePlatform::tryFrom($data['platform'] ?? '') ?? DevicePlatform::Android,
            $data['token'],
            $data['device_name'] ?? substr((string) $request->userAgent(), 0, 160),
            $data['app_version'] ?? null,
        );

        return response()->json(['message' => 'Device token terdaftar.'], 201);
    }

    public function destroyDeviceToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:512'],
        ]);

        $this->tokens->revokeFor($request->user(), $data['token']);

        return response()->json(['message' => 'Device token dihapus.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(DatabaseNotification $notification): array
    {
        $data = $notification->data;

        return [
            'id' => $notification->id,
            'type' => class_basename($notification->type),
            'title' => (string) ($data['title'] ?? 'Notifikasi'),
            'body' => (string) ($data['body'] ?? ''),
            'action_url' => $data['action_url'] ?? null,
            'icon' => (string) ($data['icon'] ?? 'bell'),
            'data' => $data,
            'read_at' => $notification->read_at?->toIso8601String(),
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }
}
