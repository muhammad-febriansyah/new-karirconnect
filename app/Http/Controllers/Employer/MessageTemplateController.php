<?php

namespace App\Http\Controllers\Employer;

use App\Enums\MessageTemplateCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\StoreMessageTemplateRequest;
use App\Models\Company;
use App\Models\MessageTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MessageTemplateController extends Controller
{
    public function index(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $templates = MessageTemplate::query()
            ->where('company_id', $company->id)
            ->orderBy('category')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (MessageTemplate $t): array => [
                'id' => $t->id,
                'name' => $t->name,
                'category' => $t->category->value,
                'category_label' => $t->category->label(),
                'body' => $t->body,
                'is_active' => $t->is_active,
                'sort_order' => $t->sort_order,
                'created_by' => $t->creator?->name,
                'updated_at' => optional($t->updated_at)->toIso8601String(),
            ]);

        return Inertia::render('employer/message-templates/index', [
            'templates' => $templates,
            'categories' => collect(MessageTemplateCategory::cases())
                ->map(fn (MessageTemplateCategory $c) => ['value' => $c->value, 'label' => $c->label()])
                ->values(),
        ]);
    }

    public function store(StoreMessageTemplateRequest $request): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        MessageTemplate::query()->create([
            ...$request->validated(),
            'company_id' => $company->id,
            'created_by_user_id' => $request->user()->id,
        ]);

        return back()->with('success', 'Template pesan disimpan.');
    }

    public function update(StoreMessageTemplateRequest $request, MessageTemplate $template): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null && $template->company_id === $company->id, 404);

        $template->update($request->validated());

        return back()->with('success', 'Template pesan diperbarui.');
    }

    public function destroy(Request $request, MessageTemplate $template): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null && $template->company_id === $company->id, 404);

        $template->delete();

        return back()->with('success', 'Template pesan dihapus.');
    }

    private function resolveCompany(Request $request): ?Company
    {
        return Company::query()->where('owner_id', $request->user()->id)->first();
    }
}
