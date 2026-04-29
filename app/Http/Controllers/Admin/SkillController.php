<?php

namespace App\Http\Controllers\Admin;

use App\Http\Requests\Admin\SkillRequest;
use App\Models\Skill;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SkillController extends AdminController
{
    public function index(): Response
    {
        return Inertia::render('admin/skills/index', [
            'items' => Skill::query()
                ->orderBy('category')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(SkillRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['slug'] ??= str($data['name'])->slug()->value();

        Skill::query()->create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Skill berhasil ditambahkan.']);

        return to_route('admin.skills.index');
    }

    public function update(SkillRequest $request, Skill $skill): RedirectResponse
    {
        $data = $request->validated();
        $data['slug'] ??= str($data['name'])->slug()->value();

        $skill->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Skill berhasil diperbarui.']);

        return to_route('admin.skills.index');
    }

    public function destroy(Skill $skill): RedirectResponse
    {
        $skill->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Skill berhasil dihapus.']);

        return to_route('admin.skills.index');
    }
}
