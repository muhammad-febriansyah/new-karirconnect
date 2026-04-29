<?php

namespace App\Http\Controllers\Admin;

use App\Http\Requests\Admin\JobCategoryRequest;
use App\Models\JobCategory;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class JobCategoryController extends AdminController
{
    public function index(): Response
    {
        return Inertia::render('admin/job-categories/index', [
            'items' => JobCategory::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(JobCategoryRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['slug'] ??= str($data['name'])->slug()->value();

        JobCategory::query()->create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Kategori lowongan berhasil ditambahkan.']);

        return to_route('admin.job-categories.index');
    }

    public function update(JobCategoryRequest $request, JobCategory $jobCategory): RedirectResponse
    {
        $data = $request->validated();
        $data['slug'] ??= str($data['name'])->slug()->value();

        $jobCategory->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Kategori lowongan berhasil diperbarui.']);

        return to_route('admin.job-categories.index');
    }

    public function destroy(JobCategory $jobCategory): RedirectResponse
    {
        $jobCategory->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Kategori lowongan berhasil dihapus.']);

        return to_route('admin.job-categories.index');
    }
}
