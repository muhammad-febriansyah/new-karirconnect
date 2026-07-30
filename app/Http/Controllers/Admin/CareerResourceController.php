<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CareerResourceRequest;
use App\Models\CareerResource;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CareerResourceController extends Controller
{
    /**
     * Filtering, searching, and paging happen here rather than in the browser.
     * The page holds one page of rows, so a client-side filter would search
     * that slice and quietly report "not found" for an article that exists.
     */
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();
        $category = $request->string('category')->toString();
        $search = trim($request->string('search')->toString());

        $items = CareerResource::query()
            ->with('author:id,name')
            ->when($status === 'draft', fn ($query) => $query->where('is_published', false))
            ->when($status === 'scheduled', fn ($query) => $query->scheduled())
            ->when($status === 'live', fn ($query) => $query->live())
            ->when($category !== '', fn ($query) => $query->where('category', $category))
            ->when($search !== '', fn ($query) => $query->where(function ($inner) use ($search): void {
                $inner->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('excerpt', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            }))
            ->latest('published_at')
            ->latest('id')
            ->paginate(12)
            ->withQueryString()
            ->through(fn (CareerResource $resource): array => [
                'id' => $resource->id,
                'title' => $resource->title,
                'slug' => $resource->slug,
                // Falls back to the body so a card is never blank; the tags are
                // stripped here because the card renders plain text.
                'excerpt' => Str::limit(
                    trim((string) ($resource->excerpt ?: strip_tags($resource->body))),
                    160
                ),
                'category' => $resource->category,
                'reading_minutes' => $resource->reading_minutes,
                'views_count' => $resource->views_count,
                'published_at' => optional($resource->published_at)->toIso8601String(),
                'thumbnail_url' => $resource->thumbnail_path
                    ? Storage::disk('public')->url($resource->thumbnail_path)
                    : null,
                'author' => $resource->author?->name,

                // The three states are not derivable from is_published alone, so
                // the status is resolved here rather than re-implemented against
                // the browser clock.
                'status' => match (true) {
                    ! $resource->is_published => 'draft',
                    $resource->isScheduled() => 'scheduled',
                    default => 'live',
                },
            ]);

        return Inertia::render('admin/career-resources/index', [
            'items' => $items,
            'filters' => [
                'search' => $search,
                'status' => in_array($status, ['draft', 'scheduled', 'live'], true) ? $status : '',
                'category' => $category,
            ],
            'categoryOptions' => CareerResource::query()
                ->whereNotNull('category')
                ->distinct()
                ->orderBy('category')
                ->pluck('category')
                ->values(),
            'statusCounts' => [
                'all' => CareerResource::query()->count(),
                'live' => CareerResource::query()->live()->count(),
                'scheduled' => CareerResource::query()->scheduled()->count(),
                'draft' => CareerResource::query()->where('is_published', false)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/career-resources/form', [
            'mode' => 'create',
            'item' => null,
        ]);
    }

    public function store(CareerResourceRequest $request): RedirectResponse
    {
        $data = $request->validated();
        unset($data['thumbnail']);
        $data['slug'] ??= str($data['title'])->slug()->value();
        $data['author_id'] = $request->user()->id;
        $data['published_at'] = $this->resolvePublishedAt($data, null);

        if ($request->hasFile('thumbnail')) {
            $data['thumbnail_path'] = $request->file('thumbnail')?->store('career-resources', 'public');
        }

        CareerResource::query()->create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Resource karier berhasil disimpan.']);

        return to_route('admin.career-resources.index');
    }

    public function edit(CareerResource $careerResource): Response
    {
        return Inertia::render('admin/career-resources/form', [
            'mode' => 'edit',
            'item' => [
                'id' => $careerResource->id,
                'title' => $careerResource->title,
                'slug' => $careerResource->slug,
                'excerpt' => $careerResource->excerpt,
                'body' => $careerResource->body,
                'thumbnail_path' => $careerResource->thumbnail_path,
                'thumbnail_url' => $careerResource->thumbnail_path
                    ? Storage::disk('public')->url($careerResource->thumbnail_path)
                    : null,
                'category' => $careerResource->category,
                'tags' => $careerResource->tags ?? [],
                'reading_minutes' => $careerResource->reading_minutes,
                'is_published' => $careerResource->is_published,
                // datetime-local wants "Y-m-d\TH:i" and no timezone suffix.
                'published_at' => $careerResource->published_at?->format('Y-m-d\TH:i'),
                'is_scheduled' => $careerResource->isScheduled(),
            ],
        ]);
    }

    public function update(CareerResourceRequest $request, CareerResource $careerResource): RedirectResponse
    {
        $data = $request->validated();
        unset($data['thumbnail']);
        $data['slug'] ??= str($data['title'])->slug()->value();
        $data['published_at'] = $this->resolvePublishedAt($data, $careerResource->published_at);

        if ($request->hasFile('thumbnail')) {
            if ($careerResource->thumbnail_path) {
                Storage::disk('public')->delete($careerResource->thumbnail_path);
            }

            $data['thumbnail_path'] = $request->file('thumbnail')?->store('career-resources', 'public');
        }

        $careerResource->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Resource karier berhasil diperbarui.']);

        return to_route('admin.career-resources.index');
    }

    /**
     * Decides the publish moment for a save.
     *
     * A future date is what makes an article scheduled -- nothing is queued and
     * no job runs, the article simply starts matching the `live` scope once the
     * clock passes it. Unpublishing clears the date so a draft never carries a
     * stale schedule that would fire the moment it is republished.
     *
     * @param  array<string, mixed>  $data
     */
    private function resolvePublishedAt(array $data, ?CarbonInterface $existing): ?CarbonInterface
    {
        if (! $data['is_published']) {
            return null;
        }

        if (! empty($data['published_at'])) {
            return Carbon::parse($data['published_at']);
        }

        return $existing ?? now();
    }

    public function destroy(CareerResource $careerResource): RedirectResponse
    {
        if ($careerResource->thumbnail_path) {
            Storage::disk('public')->delete($careerResource->thumbnail_path);
        }

        $careerResource->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Resource karier berhasil dihapus.']);

        return to_route('admin.career-resources.index');
    }
}
