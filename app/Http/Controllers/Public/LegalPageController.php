<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\LegalPage;
use Inertia\Inertia;
use Inertia\Response;

class LegalPageController extends Controller
{
    public function show(LegalPage $legalPage): Response
    {
        $relatedPages = LegalPage::query()
            ->where('id', '!=', $legalPage->id)
            ->orderBy('title')
            ->get(['slug', 'title']);

        return Inertia::render('public/legal/show', [
            'page' => $legalPage,
            'relatedPages' => $relatedPages,
        ]);
    }
}
