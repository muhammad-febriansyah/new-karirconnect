<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Allow access only when the authenticated user matches one of the given roles.
     * Usage: ->middleware('role:admin') or 'role:admin,employer'.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        if (! $user->is_active) {
            abort(403, 'Akun Anda dinonaktifkan.');
        }

        $allowed = collect($roles)
            ->map(fn (string $role) => UserRole::from($role))
            ->contains($user->role);

        if (! $allowed) {
            abort(403, 'Anda tidak memiliki akses ke area ini.');
        }

        return $next($request);
    }
}
