<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Closure;
use Illuminate\Http\Request;

abstract class AdminController extends Controller
{
    public function __construct()
    {
        $this->middleware(function (Request $request, Closure $next) {
            abort_unless($request->user()?->isAdmin(), 403);

            return $next($request);
        });
    }
}
