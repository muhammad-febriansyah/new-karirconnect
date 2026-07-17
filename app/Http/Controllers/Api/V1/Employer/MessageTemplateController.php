<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\StoreMessageTemplateRequest;
use App\Models\MessageTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Canned recruiter messages (invitation, rejection, offer, follow-up).
 */
class MessageTemplateController extends Controller
{
    use ResolvesEmployerCompany;

    public function index(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $templates = MessageTemplate::query()
            ->where('company_id', $company->id)
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->string('category')->toString()))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (MessageTemplate $template) => $this->present($template));

        return response()->json(['data' => $templates]);
    }

    public function store(StoreMessageTemplateRequest $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $template = MessageTemplate::query()->create([
            ...$request->validated(),
            'company_id' => $company->id,
            'created_by_user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->present($template)], 201);
    }

    public function update(StoreMessageTemplateRequest $request, MessageTemplate $template): JsonResponse
    {
        $this->authorizeTemplate($request, $template);

        $template->update($request->validated());

        return response()->json(['data' => $this->present($template->fresh())]);
    }

    public function destroy(Request $request, MessageTemplate $template): JsonResponse
    {
        $this->authorizeTemplate($request, $template);

        $template->delete();

        return response()->json(['message' => 'Template dihapus.']);
    }

    private function authorizeTemplate(Request $request, MessageTemplate $template): void
    {
        $company = $this->resolveCompany($request);

        abort_unless($company !== null && $template->company_id === $company->id, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(MessageTemplate $template): array
    {
        return [
            'id' => $template->id,
            'name' => $template->name,
            'category' => $template->category?->value ?? $template->category,
            'body' => $template->body,
            'is_active' => (bool) $template->is_active,
            'sort_order' => $template->sort_order,
        ];
    }
}
