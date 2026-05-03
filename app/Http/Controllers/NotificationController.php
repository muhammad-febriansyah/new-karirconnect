<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $notifications = $user->notifications()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (DatabaseNotification $n) => $this->present($n));

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
            'unreadCount' => $user->unreadNotifications()->count(),
        ]);
    }

    public function unread(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'count' => $user->unreadNotifications()->count(),
            'recent' => $user->unreadNotifications()
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (DatabaseNotification $n) => $this->present($n))
                ->values(),
        ]);
    }

    public function markRead(Request $request, string $notification): RedirectResponse
    {
        $row = $request->user()->notifications()->where('id', $notification)->firstOrFail();
        $row->markAsRead();

        return back()->with('success', 'Notifikasi ditandai sebagai sudah dibaca.');
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return back()->with('success', 'Semua notifikasi berhasil ditandai sebagai sudah dibaca.');
    }

    public function destroy(Request $request, string $notification): RedirectResponse
    {
        $row = $request->user()->notifications()->where('id', $notification)->firstOrFail();
        $row->delete();

        return back()->with('success', 'Notifikasi berhasil dihapus.');
    }

    /**
     * @return array<string, mixed>
     */
    private function present(DatabaseNotification $n): array
    {
        $data = $n->data ?? [];

        return [
            'id' => $n->id,
            'type' => class_basename($n->type),
            'title' => (string) ($data['title'] ?? 'Notifikasi'),
            'body' => (string) ($data['body'] ?? ''),
            'action_url' => $data['action_url'] ?? null,
            'icon' => (string) ($data['icon'] ?? 'bell'),
            'data' => $data,
            'read_at' => optional($n->read_at)->toIso8601String(),
            'created_at' => optional($n->created_at)->toIso8601String(),
        ];
    }
}
