<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\StoreInterviewTemplateRequest;
use App\Models\AiInterviewTemplate;
use App\Models\AiInterviewTemplateQuestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * AI interview templates: the question set an employer attaches to a job so
 * candidates can be auto-interviewed.
 */
class AiInterviewTemplateController extends Controller
{
    use ResolvesEmployerCompany;

    /**
     * Mirrors Employer\AiInterviewTemplateController::QUESTION_CATEGORIES,
     * which is a private constant there.
     *
     * @var array<int, string>
     */
    private const QUESTION_CATEGORIES = ['technical', 'behavioral', 'situational', 'culture', 'general'];

    public function index(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $templates = AiInterviewTemplate::query()
            ->withCount('questions')
            ->where('company_id', $company->id)
            ->latest('id')
            ->get()
            ->map(fn (AiInterviewTemplate $template) => $this->present($template));

        return response()->json(['data' => $templates]);
    }

    public function show(Request $request, AiInterviewTemplate $template): JsonResponse
    {
        $this->authorizeTemplate($request, $template);

        $template->load('questions');

        return response()->json([
            'data' => [
                ...$this->present($template),
                'questions' => $template->questions
                    ->sortBy('order_number')
                    ->map(fn (AiInterviewTemplateQuestion $question) => [
                        'id' => $question->id,
                        'order_number' => $question->order_number,
                        'category' => $question->category,
                        'question' => $question->question,
                        'context' => $question->context,
                        'expected_keywords' => $question->expected_keywords,
                        'max_duration_seconds' => $question->max_duration_seconds,
                    ])->values(),
            ],
        ]);
    }

    public function store(StoreInterviewTemplateRequest $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $template = AiInterviewTemplate::query()->create([
            ...$request->validated(),
            'company_id' => $company->id,
        ]);

        return response()->json(['data' => $this->present($template->loadCount('questions'))], 201);
    }

    public function update(StoreInterviewTemplateRequest $request, AiInterviewTemplate $template): JsonResponse
    {
        $this->authorizeTemplate($request, $template);

        $template->update($request->validated());

        return response()->json(['data' => $this->present($template->fresh()->loadCount('questions'))]);
    }

    public function destroy(Request $request, AiInterviewTemplate $template): JsonResponse
    {
        $this->authorizeTemplate($request, $template);

        $template->delete();

        return response()->json(['message' => 'Template dihapus.']);
    }

    public function storeQuestion(Request $request, AiInterviewTemplate $template): JsonResponse
    {
        $this->authorizeTemplate($request, $template);

        $question = $template->questions()->create([
            ...$this->validateQuestion($request),
            // Appended, so the template's order stays stable.
            'order_number' => (int) $template->questions()->max('order_number') + 1,
        ]);

        return response()->json(['data' => ['id' => $question->id, 'order_number' => $question->order_number]], 201);
    }

    public function updateQuestion(Request $request, AiInterviewTemplate $template, AiInterviewTemplateQuestion $question): JsonResponse
    {
        $this->authorizeTemplate($request, $template);

        abort_unless($question->template_id === $template->id, 404);

        $question->fill($this->validateQuestion($request))->save();

        return response()->json(['data' => ['id' => $question->id]]);
    }

    public function destroyQuestion(Request $request, AiInterviewTemplate $template, AiInterviewTemplateQuestion $question): JsonResponse
    {
        $this->authorizeTemplate($request, $template);

        abort_unless($question->template_id === $template->id, 404);

        $question->delete();

        return response()->json(['message' => 'Pertanyaan dihapus.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateQuestion(Request $request): array
    {
        return $request->validate([
            'category' => ['required', Rule::in(self::QUESTION_CATEGORIES)],
            'question' => ['required', 'string', 'min:5', 'max:1000'],
            'context' => ['nullable', 'string', 'max:1000'],
            'expected_keywords' => ['nullable', 'array', 'max:12'],
            'expected_keywords.*' => ['string', 'max:48'],
            'max_duration_seconds' => ['required', 'integer', 'between:30,600'],
        ]);
    }

    private function authorizeTemplate(Request $request, AiInterviewTemplate $template): void
    {
        $company = $this->resolveCompany($request);

        abort_unless($company !== null && $template->company_id === $company->id, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(AiInterviewTemplate $template): array
    {
        return [
            'id' => $template->id,
            'name' => $template->name,
            'description' => $template->description,
            'mode' => $template->mode?->value ?? $template->mode,
            'language' => $template->language,
            'duration_minutes' => $template->duration_minutes,
            'question_count' => $template->question_count,
            'questions_count' => $template->questions_count ?? null,
            'is_default' => (bool) $template->is_default,
            'job_id' => $template->job_id,
        ];
    }
}
