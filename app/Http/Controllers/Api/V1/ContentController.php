<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\ContactMessageRequest;
use App\Models\AboutPage;
use App\Models\CareerResource;
use App\Models\ContactMessage;
use App\Models\Faq;
use App\Models\LegalPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public content: FAQ, legal pages, about, career resources, contact.
 *
 * All read endpoints are open to guests, matching the web.
 */
class ContentController extends Controller
{
    public function faqs(Request $request): JsonResponse
    {
        $faqs = Faq::query()
            ->where('is_published', true)
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->string('category')->toString()))
            ->orderBy('order_number')
            ->get(['id', 'question', 'answer', 'category', 'order_number']);

        return response()->json([
            'data' => $faqs,
            'meta' => ['categories' => $faqs->pluck('category')->filter()->unique()->values()],
        ]);
    }

    public function legalPage(LegalPage $legalPage): JsonResponse
    {
        return response()->json([
            'data' => [
                'slug' => $legalPage->slug,
                'title' => $legalPage->title,
                'body' => $legalPage->body,
                'updated_at' => $legalPage->updated_at?->toIso8601String(),
            ],
        ]);
    }

    public function legalPages(): JsonResponse
    {
        return response()->json([
            'data' => LegalPage::query()->orderBy('title')->get(['slug', 'title', 'updated_at']),
        ]);
    }

    public function about(): JsonResponse
    {
        $page = AboutPage::query()->first();

        return response()->json(['data' => $page]);
    }

    public function careerResources(Request $request): JsonResponse
    {
        $resources = CareerResource::query()
            ->where('is_published', true)
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->string('category')->toString()))
            ->when($request->filled('search'), fn ($query) => $query->where('title', 'like', '%'.$request->string('search')->toString().'%'))
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50))
            ->withQueryString();

        return response()->json([
            'data' => collect($resources->items())->map(fn (CareerResource $row) => [
                'id' => $row->id,
                'title' => $row->title,
                'slug' => $row->slug,
                'excerpt' => $row->excerpt,
                'category' => $row->category,
                'tags' => $row->tags,
                'thumbnail_url' => $row->thumbnail_path ? asset('storage/'.$row->thumbnail_path) : null,
                'published_at' => $row->created_at?->toIso8601String(),
            ])->values(),
            'meta' => [
                'current_page' => $resources->currentPage(),
                'last_page' => $resources->lastPage(),
                'total' => $resources->total(),
            ],
        ]);
    }

    public function careerResource(CareerResource $careerResource): JsonResponse
    {
        // An unpublished draft is not public.
        abort_unless($careerResource->is_published, 404);

        return response()->json([
            'data' => [
                'id' => $careerResource->id,
                'title' => $careerResource->title,
                'slug' => $careerResource->slug,
                'excerpt' => $careerResource->excerpt,
                'body' => $careerResource->body,
                'category' => $careerResource->category,
                'tags' => $careerResource->tags,
                'thumbnail_url' => $careerResource->thumbnail_path
                    ? asset('storage/'.$careerResource->thumbnail_path)
                    : null,
                'author' => $careerResource->author?->name,
                'published_at' => $careerResource->created_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Contact form. Throttled on the route: it is unauthenticated and writes.
     */
    public function contact(ContactMessageRequest $request): JsonResponse
    {
        ContactMessage::query()->create([
            ...$request->validated(),
            'ip' => $request->ip(),
            'status' => 'new',
        ]);

        return response()->json([
            'message' => 'Pesan Anda sudah kami terima. Tim kami akan segera menghubungi Anda.',
        ], 201);
    }
}
