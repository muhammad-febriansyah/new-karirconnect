<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\AboutPage;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AboutPageController extends Controller
{
    public function index(): Response
    {
        $page = AboutPage::firstSingleton();

        return Inertia::render('public/about', [
            'page' => [
                'hero_title' => $page->hero_title,
                'hero_subtitle' => $page->hero_subtitle,
                'hero_image_url' => $page->hero_image_path ? Storage::disk('public')->url($page->hero_image_path) : null,
                'story_body' => $page->story_body,
                'vision' => $page->vision,
                'mission' => $page->mission,
                'values' => $page->values ?? [],
                'stats' => $page->stats ?? [],
                'team_members' => collect($page->team_members ?? [])->map(fn (array $m) => [
                    'name' => $m['name'] ?? '',
                    'role' => $m['role'] ?? null,
                    'bio_short' => $m['bio_short'] ?? null,
                    'linkedin_url' => $m['linkedin_url'] ?? null,
                    'photo_url' => isset($m['photo_path']) && $m['photo_path']
                        ? Storage::disk('public')->url($m['photo_path'])
                        : null,
                ])->values()->all(),
                'office_address' => $page->office_address,
                'office_map_embed' => $page->office_map_embed,
                'seo_title' => $page->seo_title,
                'seo_description' => $page->seo_description,
            ],
        ]);
    }
}
