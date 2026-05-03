<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Public\HomeService;
use App\Services\Seo\SeoService;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class HomeController extends Controller
{
    public function __construct(
        private readonly HomeService $home,
        private readonly SeoService $seo,
    ) {}

    public function index(): Response
    {
        return Inertia::render('welcome', [
            'canRegister' => Features::enabled(Features::registration()),
            'home' => $this->home->snapshot(),
        ])->withViewData([
            'meta' => $this->seo->home(),
        ]);
    }
}
