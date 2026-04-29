<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCompanyApproved
{
    /**
     * Block employer routes that require an approved company profile.
     * The Company model arrives in a later sprint — for now this middleware
     * simply lets the request through but is wired to the route definitions
     * so we don't have to revisit them when companies are introduced.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }
}
