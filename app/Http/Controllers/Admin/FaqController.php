<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\FaqRequest;
use App\Models\Faq;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class FaqController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/faqs/index', [
            'items' => Faq::query()->orderBy('order_number')->orderBy('question')->get(),
        ]);
    }

    public function store(FaqRequest $request): RedirectResponse
    {
        Faq::query()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'FAQ berhasil ditambahkan.']);

        return to_route('admin.faqs.index');
    }

    public function update(FaqRequest $request, Faq $faq): RedirectResponse
    {
        $faq->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'FAQ berhasil diperbarui.']);

        return to_route('admin.faqs.index');
    }

    public function destroy(Faq $faq): RedirectResponse
    {
        $faq->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'FAQ berhasil dihapus.']);

        return to_route('admin.faqs.index');
    }
}
