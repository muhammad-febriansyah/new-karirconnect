<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Force employer users to complete the company onboarding wizard before they
 * can access any other employer page. The check is keyed off
 * Company.onboarding_completed_at so admin-driven status changes don't reset
 * the wizard once an owner has finished it.
 */
class EnsureEmployerOnboarded
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== UserRole::Employer) {
            return $next($request);
        }

        if ($request->is('employer/onboarding*') || $request->is('logout')) {
            return $next($request);
        }

        $company = Company::query()->where('owner_id', $user->id)->first();

        if ($company !== null && $company->onboarding_completed_at !== null) {
            return $next($request);
        }

        if ($request->is('api/*')) {
            return response()->json([
                'message' => 'Selesaikan onboarding perusahaan terlebih dahulu.',
                'code' => 'employer_onboarding_required',
            ], 403);
        }

        return redirect()->to('/employer/onboarding');
    }
}
