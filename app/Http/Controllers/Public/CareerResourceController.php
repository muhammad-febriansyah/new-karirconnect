<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\CareerResource;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CareerResourceController extends Controller
{
    public function index(Request $request): Response
    {
        $category = $request->string('category')->toString();

        $query = CareerResource::query()
            ->where('is_published', true)
            ->orderByDesc('published_at')
            ->orderByDesc('id');

        if ($category !== '') {
            $query->where('category', $category);
        }

        return Inertia::render('public/career-resources/index', [
            'filters' => [
                'category' => $category,
            ],
            'categories' => CareerResource::query()
                ->where('is_published', true)
                ->whereNotNull('category')
                ->distinct()
                ->orderBy('category')
                ->pluck('category')
                ->values(),
            'items' => $query->get()->map(fn (CareerResource $resource): array => [
                'id' => $resource->id,
                'title' => $resource->title,
                'slug' => $resource->slug,
                'excerpt' => $resource->excerpt,
                'category' => $resource->category,
                'tags' => $resource->tags ?? [],
                'reading_minutes' => $resource->reading_minutes,
                'views_count' => $resource->views_count,
                'published_at' => optional($resource->published_at)->toIso8601String(),
            ]),
        ]);
    }

    public function show(CareerResource $careerResource): Response
    {
        abort_unless($careerResource->is_published, 404);

        $careerResource->increment('views_count');

        return Inertia::render('public/career-resources/show', [
            'item' => [
                'id' => $careerResource->id,
                'title' => $careerResource->title,
                'slug' => $careerResource->slug,
                'excerpt' => $careerResource->excerpt,
                'body' => $careerResource->body,
                'category' => $careerResource->category,
                'tags' => $careerResource->tags ?? [],
                'reading_minutes' => $careerResource->reading_minutes,
                'views_count' => $careerResource->views_count + 1,
                'published_at' => optional($careerResource->published_at)->toIso8601String(),
            ],
            'related' => CareerResource::query()
                ->where('is_published', true)
                ->whereKeyNot($careerResource->id)
                ->when($careerResource->category, fn ($query) => $query->where('category', $careerResource->category))
                ->latest('published_at')
                ->limit(3)
                ->get(['id', 'title', 'slug', 'category', 'reading_minutes']),
        ]);
    }
}
