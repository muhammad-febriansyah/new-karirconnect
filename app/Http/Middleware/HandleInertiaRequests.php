<?php

namespace App\Http\Middleware;

use App\Services\Settings\SettingService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    public function __construct(private readonly SettingService $settings) {}

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $public = $this->settings->publicByGroup();

        return [
            ...parent::share($request),
            'name' => $public['general']['app_name'] ?? config('app.name'),
            'auth' => [
                'user' => fn () => $this->resolveUser($request),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],
            'app' => [
                'name' => $public['general']['app_name'] ?? config('app.name'),
                'tagline' => $public['general']['app_tagline'] ?? null,
                'contact_email' => $public['general']['contact_email'] ?? null,
                'contact_phone' => $public['general']['contact_phone'] ?? null,
                'locale' => $public['general']['default_locale'] ?? 'id',
            ],
            'branding' => [
                'logo_path' => $this->asset($public['branding']['logo_path'] ?? null),
                'logo_dark_path' => $this->asset($public['branding']['logo_dark_path'] ?? null),
                'favicon_path' => $this->asset($public['branding']['favicon_path'] ?? null),
                'primary_color' => $public['branding']['primary_color'] ?? null,
                'login_background_path' => $this->asset($public['branding']['login_background_path'] ?? null),
            ],
            'seo' => [
                'meta_title' => $public['seo']['meta_title'] ?? null,
                'meta_description' => $public['seo']['meta_description'] ?? null,
                'meta_keywords' => $public['seo']['meta_keywords'] ?? null,
                'og_image_path' => $this->asset($public['seo']['og_image_path'] ?? null),
                'google_analytics_id' => $public['seo']['google_analytics_id'] ?? null,
                'google_tag_manager_id' => $public['seo']['google_tag_manager_id'] ?? null,
            ],
            'features' => $public['feature_flags'] ?? [],
            'notificationCenter' => fn () => $this->resolveNotifications($request),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveNotifications(Request $request): array
    {
        $user = $request->user();

        if (! $user) {
            return ['unread_count' => 0, 'recent' => []];
        }

        $unread = $user->unreadNotifications()->latest()->limit(5)->get();

        return [
            'unread_count' => $user->unreadNotifications()->count(),
            'recent' => $unread->map(fn ($n) => [
                'id' => $n->id,
                'title' => (string) ($n->data['title'] ?? 'Notifikasi'),
                'body' => (string) ($n->data['body'] ?? ''),
                'action_url' => $n->data['action_url'] ?? null,
                'icon' => (string) ($n->data['icon'] ?? 'bell'),
                'created_at' => optional($n->created_at)->toIso8601String(),
            ])->values(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function resolveUser(Request $request): ?array
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        return [
            ...$user->only([
                'id', 'name', 'email', 'phone', 'locale', 'is_active',
                'email_verified_at', 'created_at', 'updated_at',
            ]),
            'role' => $user->role?->value,
            'avatar_url' => $this->asset($user->avatar_path),
            'two_factor_enabled' => (bool) $user->two_factor_confirmed_at,
        ];
    }

    private function asset(mixed $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        return asset('storage/'.$path);
    }
}
