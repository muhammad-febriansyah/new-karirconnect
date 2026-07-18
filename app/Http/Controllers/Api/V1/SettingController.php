<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Settings\SettingService;
use Illuminate\Http\JsonResponse;

/**
 * Public app configuration for the mobile client: branding, app identity,
 * feature flags, and social links.
 *
 * Mirrors the branding the web shares via Inertia, but exposed over the API so
 * the app can render the real logo, name, and tagline instead of bundled
 * placeholders. Only settings flagged is_public are ever returned.
 */
class SettingController extends Controller
{
    public function __construct(private readonly SettingService $settings) {}

    public function index(): JsonResponse
    {
        $public = $this->settings->publicByGroup();
        $general = $public['general'] ?? [];
        $branding = $public['branding'] ?? [];
        $social = $public['social'] ?? [];

        return response()->json([
            'data' => [
                'app' => [
                    'name' => $general['app_name'] ?? config('app.name'),
                    'tagline' => $general['app_tagline'] ?? null,
                    'contact_email' => $general['contact_email'] ?? null,
                    'contact_phone' => $general['contact_phone'] ?? null,
                ],
                'branding' => [
                    'logo_url' => $this->asset($branding['logo_path'] ?? null),
                    'favicon_url' => $this->asset($branding['favicon_path'] ?? null),
                    'login_background_url' => $this->asset($branding['login_background_path'] ?? null),
                    'primary_color' => $branding['primary_color'] ?? null,
                ],
                'features' => $public['feature_flags'] ?? [],
                'social' => [
                    'linkedin' => $social['linkedin_url'] ?? null,
                    'instagram' => $social['instagram_url'] ?? null,
                    'twitter' => $social['twitter_url'] ?? null,
                    'facebook' => $social['facebook_url'] ?? null,
                    'youtube' => $social['youtube_url'] ?? null,
                    'tiktok' => $social['tiktok_url'] ?? null,
                ],
            ],
        ]);
    }

    /**
     * Resolve a stored public-disk path to an absolute URL, mirroring the web's
     * branding sharing. Returns null when the path is empty.
     */
    private function asset(mixed $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        return asset('storage/'.$path);
    }
}
