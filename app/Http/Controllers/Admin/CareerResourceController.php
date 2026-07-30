<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CareerResourceRequest;
use App\Models\CareerResource;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CareerResourceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/career-resources/index', [
            'items' => CareerResource::query()
                ->with('author:id,name')
                ->latest('published_at')
                ->latest('id')
                ->get()
                ->map(function (CareerResource $resource): array {
                    // The three states are not derivable from is_published alone,
                    // so the status is resolved here rather than re-implemented
                    // against the clock in the browser.
                    return array_merge($resource->toArray(), [
                        'status' => match (true) {
                            ! $resource->is_published => 'draft',
                            $resource->isScheduled() => 'scheduled',
                            default => 'live',
                        },
                    ]);
                }),
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
