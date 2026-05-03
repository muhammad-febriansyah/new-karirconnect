<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AnnouncementRequest;
use App\Models\Announcement;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/announcements/index', [
            'items' => Announcement::query()
                ->with('author:id,name')
                ->latest('published_at')
                ->latest('id')
                ->get(),
        ]);
    }

    public function store(AnnouncementRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['slug'] ??= str($data['title'])->slug()->value();
        $data['author_id'] = $request->user()->id;
        $data['published_at'] = $data['is_published'] ? now() : null;

        Announcement::query()->create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengumuman berhasil disimpan.']);

        return to_route('admin.announcements.index');
    }

    public function update(AnnouncementRequest $request, Announcement $announcement): RedirectResponse
    {
        $data = $request->validated();
        $data['slug'] ??= str($data['title'])->slug()->value();
        $data['published_at'] = $data['is_published']
            ? ($announcement->published_at ?? now())
            : null;

        $announcement->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengumuman berhasil diperbarui.']);

        return to_route('admin.announcements.index');
    }

    public function destroy(Announcement $announcement): RedirectResponse
    {
        $announcement->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengumuman berhasil dihapus.']);

        return to_route('admin.announcements.index');
    }
}
