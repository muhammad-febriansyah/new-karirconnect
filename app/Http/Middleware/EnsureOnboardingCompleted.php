<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Force employees who have not completed onboarding through the
 * /employee/onboarding flow before they can access any protected page.
 */
class EnsureOnboardingCompleted
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== UserRole::Employee) {
            return $next($request);
        }

        if ($user->onboarding_completed_at !== null) {
            return $next($request);
        }

        $onboardingPath = '/employee/onboarding';

        if ($request->is('employee/onboarding*') || $request->is('logout')) {
            return $next($request);
        }

        if ($request->expectsJson() || $request->header('X-Inertia')) {
            return redirect()->to($onboardingPath);
        }

        return redirect()->to($onboardingPath);
    }
}
