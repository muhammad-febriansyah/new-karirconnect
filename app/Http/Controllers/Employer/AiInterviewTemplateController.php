<?php

namespace App\Http\Controllers\Employer;

use App\Enums\AiInterviewMode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\StoreInterviewTemplateRequest;
use App\Models\AiInterviewTemplate;
use App\Models\AiInterviewTemplateQuestion;
use App\Models\Company;
use App\Models\Job;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AiInterviewTemplateController extends Controller
{
    private const QUESTION_CATEGORIES = ['opening', 'technical', 'behavioral', 'situational', 'culture', 'closing'];

    public function index(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $templates = AiInterviewTemplate::query()
            ->with(['job:id,title', 'questions'])
            ->where('company_id', $company->id)
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get()
            ->map(fn (AiInterviewTemplate $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'mode' => $t->mode?->value,
                'language' => $t->language,
                'duration_minutes' => $t->duration_minutes,
                'question_count' => $t->question_count,
                'is_default' => $t->is_default,
                'job_id' => $t->job_id,
                'job' => $t->job ? ['id' => $t->job->id, 'title' => $t->job->title] : null,
                'questions' => $t->questions->map(fn (AiInterviewTemplateQuestion $q) => [
                    'id' => $q->id,
                    'order_number' => $q->order_number,
                    'category' => $q->category,
                    'question' => $q->question,
                    'context' => $q->context,
                    'expected_keywords' => $q->expected_keywords ?? [],
                    'max_duration_seconds' => $q->max_duration_seconds,
                ])->values(),
            ])
            ->values();

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
            'categoryOptions' => array_map(
                fn (string $k) => ['value' => $k, 'label' => $this->categoryLabel($k)],
                self::QUESTION_CATEGORIES,
            ),
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

    public function storeQuestion(Request $request, AiInterviewTemplate $template): RedirectResponse
    {
        $this->authorizeTemplate($request, $template);

        $data = $this->validateQuestion($request);

        $next = (int) $template->questions()->max('order_number') + 1;

        $template->questions()->create([
            ...$data,
            'order_number' => $next,
        ]);

        return back()->with('success', 'Pertanyaan ditambahkan.');
    }

    public function updateQuestion(Request $request, AiInterviewTemplate $template, AiInterviewTemplateQuestion $question): RedirectResponse
    {
        $this->authorizeTemplate($request, $template);
        abort_unless($question->template_id === $template->id, 404);

        $data = $this->validateQuestion($request);

        $question->fill($data)->save();

        return back()->with('success', 'Pertanyaan diperbarui.');
    }

    public function destroyQuestion(Request $request, AiInterviewTemplate $template, AiInterviewTemplateQuestion $question): RedirectResponse
    {
        $this->authorizeTemplate($request, $template);
        abort_unless($question->template_id === $template->id, 404);

        $question->delete();

        return back()->with('success', 'Pertanyaan dihapus.');
    }

    public function reorderQuestions(Request $request, AiInterviewTemplate $template): RedirectResponse
    {
        $this->authorizeTemplate($request, $template);

        $data = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*' => ['integer'],
        ]);

        $ids = array_values($data['order']);
        $valid = $template->questions()->whereIn('id', $ids)->pluck('id')->all();
        if (count($valid) !== count($ids)) {
            abort(422, 'Sebagian pertanyaan tidak terdaftar di template ini.');
        }

        DB::transaction(function () use ($ids): void {
            foreach ($ids as $position => $id) {
                AiInterviewTemplateQuestion::query()
                    ->where('id', $id)
                    ->update(['order_number' => $position + 1]);
            }
        });

        return back();
    }

    /**
     * @return array{category: string, question: string, context: ?string, expected_keywords: array<int, string>|null, max_duration_seconds: int}
     */
    private function validateQuestion(Request $request): array
    {
        return $request->validate([
            'category' => ['required', 'string', 'in:'.implode(',', self::QUESTION_CATEGORIES)],
            'question' => ['required', 'string', 'min:5', 'max:1000'],
            'context' => ['nullable', 'string', 'max:1000'],
            'expected_keywords' => ['nullable', 'array', 'max:12'],
            'expected_keywords.*' => ['string', 'max:48'],
            'max_duration_seconds' => ['required', 'integer', 'between:30,600'],
        ]);
    }

    private function categoryLabel(string $key): string
    {
        return match ($key) {
            'opening' => 'Pembuka',
            'technical' => 'Teknis',
            'behavioral' => 'Perilaku',
            'situational' => 'Situasional',
            'culture' => 'Budaya Kerja',
            'closing' => 'Penutup',
            default => ucfirst($key),
        };
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
