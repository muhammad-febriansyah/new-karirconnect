<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LegalPageRequest;
use App\Models\LegalPage;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class LegalPageController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/legal-pages/index', [
            'items' => LegalPage::query()->orderBy('slug')->get(),
        ]);
    }

    public function store(LegalPageRequest $request): RedirectResponse
    {
        LegalPage::query()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Halaman legal berhasil ditambahkan.']);

        return to_route('admin.legal-pages.index');
    }

    public function update(LegalPageRequest $request, LegalPage $legalPage): RedirectResponse
    {
        $legalPage->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Halaman legal berhasil diperbarui.']);

        return to_route('admin.legal-pages.index');
    }

    public function destroy(LegalPage $legalPage): RedirectResponse
    {
        $legalPage->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Halaman legal berhasil dihapus.']);

        return to_route('admin.legal-pages.index');
    }
}
