<?php

namespace App\Http\Controllers\Admin;

use App\Http\Requests\Admin\IndustryRequest;
use App\Models\Industry;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class IndustryController extends AdminController
{
    public function index(): Response
    {
        return Inertia::render('admin/industries/index', [
            'items' => Industry::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(IndustryRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['slug'] ??= str($data['name'])->slug()->value();

        Industry::query()->create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Industri berhasil ditambahkan.']);

        return to_route('admin.industries.index');
    }

    public function update(IndustryRequest $request, Industry $industry): RedirectResponse
    {
        $data = $request->validated();
        $data['slug'] ??= str($data['name'])->slug()->value();

        $industry->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Industri berhasil diperbarui.']);

        return to_route('admin.industries.index');
    }

    public function destroy(Industry $industry): RedirectResponse
    {
        $industry->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Industri berhasil dihapus.']);

        return to_route('admin.industries.index');
    }
}
