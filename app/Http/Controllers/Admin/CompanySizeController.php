<?php

namespace App\Http\Controllers\Admin;

use App\Http\Requests\Admin\CompanySizeRequest;
use App\Models\CompanySize;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CompanySizeController extends AdminController
{
    public function index(): Response
    {
        return Inertia::render('admin/company-sizes/index', [
            'items' => CompanySize::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(CompanySizeRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['slug'] ??= str($data['name'])->slug()->value();

        CompanySize::query()->create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ukuran perusahaan berhasil ditambahkan.']);

        return to_route('admin.company-sizes.index');
    }

    public function update(CompanySizeRequest $request, CompanySize $companySize): RedirectResponse
    {
        $data = $request->validated();
        $data['slug'] ??= str($data['name'])->slug()->value();

        $companySize->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ukuran perusahaan berhasil diperbarui.']);

        return to_route('admin.company-sizes.index');
    }

    public function destroy(CompanySize $companySize): RedirectResponse
    {
        $companySize->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ukuran perusahaan berhasil dihapus.']);

        return to_route('admin.company-sizes.index');
    }
}
