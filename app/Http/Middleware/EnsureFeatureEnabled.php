<?php

namespace App\Http\Middleware;

use App\Services\Settings\SettingService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFeatureEnabled
{
    public function __construct(private readonly SettingService $settings) {}

    /**
     * Block the request when a feature flag is off. Mirrors the `Gate::allows('feature', $flag)`
     * check so admins can disable a section (e.g. AI coach) without code changes.
     *
     * Usage: ->middleware('feature:ai_coach_enabled')
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $flag): Response
    {
        $enabled = (bool) $this->settings->get("feature_flags.{$flag}");

        if (! $enabled) {
            abort(404, 'Fitur ini tidak tersedia.');
        }

        return $next($request);
    }
}
