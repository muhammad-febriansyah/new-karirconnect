<?php

namespace App\Http\Controllers\Employer;

use App\Enums\AiInterviewMode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\StoreInterviewTemplateRequest;
use App\Models\AiInterviewTemplate;
use App\Models\Company;
use App\Models\Job;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiInterviewTemplateController extends Controller
{
    public function index(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $templates = AiInterviewTemplate::query()
            ->with(['job:id,title'])
            ->where('company_id', $company->id)
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        $jobs = Job::query()
            ->where('company_id', $company->id)
            ->orderByDesc('updated_at')
            ->get(['id', 'title'])
            ->map(fn ($j) => ['value' => (string) $j->id, 'label' => $j->title])
            ->all();

        return Inertia::render('employer/ai-interview-templates/index', [
            'templates' => $templates,
            'jobOptions' => $jobs,
            'modeOptions' => AiInterviewMode::selectItems(),
        ]);
    }

    public function store(StoreInterviewTemplateRequest $request): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $data = $request->validated();
        if (! empty($data['is_default'])) {
            AiInterviewTemplate::query()
                ->where('company_id', $company->id)
                ->update(['is_default' => false]);
        }

        AiInterviewTemplate::query()->create([
            ...$data,
            'company_id' => $company->id,
        ]);

        return back()->with('success', 'Template AI Interview dibuat.');
    }

    public function update(StoreInterviewTemplateRequest $request, AiInterviewTemplate $template): RedirectResponse
    {
        $this->authorizeTemplate($request, $template);

        $data = $request->validated();
        if (! empty($data['is_default'])) {
            AiInterviewTemplate::query()
                ->where('company_id', $template->company_id)
                ->where('id', '!=', $template->id)
                ->update(['is_default' => false]);
        }

        $template->fill($data)->save();

        return back()->with('success', 'Template diperbarui.');
    }

    public function destroy(Request $request, AiInterviewTemplate $template): RedirectResponse
    {
        $this->authorizeTemplate($request, $template);
        $template->delete();

        return back()->with('success', 'Template dihapus.');
    }

    private function resolveCompany(Request $request): ?Company
    {
        return Company::query()->where('owner_id', $request->user()->id)->first();
    }

    private function authorizeTemplate(Request $request, AiInterviewTemplate $template): void
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null && $template->company_id === $company->id, 403);
    }
}
