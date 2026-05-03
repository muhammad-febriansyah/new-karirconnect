<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use Inertia\Inertia;
use Inertia\Response;

class FaqController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('public/faq', [
            'items' => Faq::query()
                ->where('is_published', true)
                ->orderBy('order_number')
                ->orderBy('question')
                ->get(),
        ]);
    }
}
