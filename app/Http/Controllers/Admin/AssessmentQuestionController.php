<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssessmentQuestionRequest;
use App\Models\AssessmentQuestion;
use App\Models\Skill;
use App\Services\Ai\AiAuditService;
use App\Services\Ai\AiClientFactory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AssessmentQuestionController extends Controller
{
    public function __construct(
        private readonly AiClientFactory $aiFactory,
        private readonly AiAuditService $aiAudit,
    ) {}

    public function index(): Response
    {
        return Inertia::render('admin/assessment-questions/index', [
            'items' => [],
            'skills' => $this->skillSummaries(),
            'selectedSkill' => null,
        ]);
    }

    public function showSkill(Skill $skill): Response
    {
        return Inertia::render('admin/assessment-questions/index', [
            'items' => $this->questionsForSkill($skill),
            'skills' => $this->skillSummaries(),
            'selectedSkill' => [
                'id' => $skill->id,
                'name' => $skill->name,
                'category' => $skill->category,
            ],
        ]);
    }

    public function store(AssessmentQuestionRequest $request): RedirectResponse
    {
        AssessmentQuestion::query()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Soal assessment berhasil ditambahkan.']);

        return to_route('admin.assessment-questions.skill', $request->validated('skill_id'));
    }

    public function update(AssessmentQuestionRequest $request, AssessmentQuestion $assessmentQuestion): RedirectResponse
    {
        $assessmentQuestion->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Soal assessment berhasil diperbarui.']);

        return to_route('admin.assessment-questions.skill', $assessmentQuestion->skill_id);
    }

    public function destroy(AssessmentQuestion $assessmentQuestion): RedirectResponse
    {
        $assessmentQuestion->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Soal assessment berhasil dihapus.']);

        return to_route('admin.assessment-questions.skill', $assessmentQuestion->skill_id);
    }

    public function generate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'skill_id' => ['required', 'integer', 'exists:skills,id'],
            'type' => ['required', Rule::in(['multiple_choice', 'text'])],
            'difficulty' => ['required', Rule::in(['easy', 'medium', 'hard'])],
            'count' => ['required', 'integer', 'between:1,20'],
            'topic' => ['nullable', 'string', 'max:500'],
            'time_limit_seconds' => ['required', 'integer', 'between:30,3600'],
        ]);

        $skill = Skill::query()->findOrFail($data['skill_id']);
        $client = $this->aiFactory->make();

        $response = $this->aiAudit->run(
            $client,
            'assessment-question-generator',
            [
                ['role' => 'system', 'content' => $this->generationSystemPrompt()],
                ['role' => 'user', 'content' => $this->generationUserPrompt($skill, $data)],
            ],
            [
                'intent' => 'assessment_questions',
                'count' => $data['count'],
                'type' => $data['type'],
            ],
            $request->user()?->id,
        );

        $questions = $this->normalizeGeneratedQuestions($response->asArray(), $data);

        if ($questions === []) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'AI belum menghasilkan format soal yang valid. Coba ulangi dengan instruksi lebih spesifik.',
            ]);

            return back();
        }

        foreach ($questions as $question) {
            AssessmentQuestion::query()->create([
                'skill_id' => $skill->id,
                'type' => $data['type'],
                'question' => $question['question'],
                'options' => $data['type'] === 'multiple_choice' ? $question['options'] : [],
                'correct_answer' => ['value' => $question['answer']],
                'difficulty' => $data['difficulty'],
                'time_limit_seconds' => $data['time_limit_seconds'],
                'is_active' => true,
            ]);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => count($questions).' soal berhasil dibuat dengan AI.',
        ]);

        return to_route('admin.assessment-questions.skill', $skill);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function skillSummaries(): Collection
    {
        return Skill::query()
            ->select(['id', 'name', 'category', 'is_active', 'updated_at'])
            ->withCount([
                'assessmentQuestions as questions_count',
                'assessmentQuestions as active_questions_count' => fn ($query) => $query->where('is_active', true),
                'assessmentQuestions as multiple_choice_count' => fn ($query) => $query->where('type', 'multiple_choice'),
                'assessmentQuestions as text_count' => fn ($query) => $query->where('type', 'text'),
            ])
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn (Skill $skill): array => [
                'id' => $skill->id,
                'name' => $skill->name,
                'category' => $skill->category,
                'questions_count' => $skill->questions_count,
                'active_questions_count' => $skill->active_questions_count,
                'multiple_choice_count' => $skill->multiple_choice_count,
                'text_count' => $skill->text_count,
                'updated_at' => $skill->updated_at?->format('d M Y, H:i'),
            ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function questionsForSkill(Skill $skill): Collection
    {
        return AssessmentQuestion::query()
            ->whereBelongsTo($skill)
            ->with('skill:id,name')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (AssessmentQuestion $question): array => [
                'id' => $question->id,
                'skill_id' => $question->skill_id,
                'skill_name' => $question->skill?->name,
                'type' => $question->type,
                'question' => $question->question,
                'options' => $question->options ?? [],
                'correct_answer' => $question->correct_answer,
                'difficulty' => $question->difficulty,
                'time_limit_seconds' => $question->time_limit_seconds,
                'is_active' => $question->is_active,
            ]);
    }

    private function generationSystemPrompt(): string
    {
        return 'You are an assessment question generator for an Indonesian career platform. '.
            'Return strict JSON only with shape {"questions":[{"question":"...","options":["..."],"answer":"..."}]}. '.
            'For type text, use an empty options array and provide a concise reference answer. '.
            'For type multiple_choice, provide exactly 4 options and make answer exactly equal to one option.';
    }

    /**
     * @param  array{skill_id:int,type:string,difficulty:string,count:int,topic?:string|null,time_limit_seconds:int}  $data
     */
    private function generationUserPrompt(Skill $skill, array $data): string
    {
        $type = $data['type'] === 'multiple_choice' ? 'pilihan ganda' : 'teks';
        $topic = filled($data['topic'] ?? null) ? " Fokus/topik khusus: {$data['topic']}." : '';

        return "Buat {$data['count']} soal assessment {$type} untuk skill {$skill->name}. ".
            "Level kesulitan: {$data['difficulty']}.{$topic} ".
            'Gunakan Bahasa Indonesia yang jelas, praktis, dan relevan untuk kandidat kerja.';
    }

    /**
     * @param  array<string, mixed>|null  $payload
     * @param  array{type:string}  $data
     * @return array<int, array{question:string, options:array<int, string>, answer:string}>
     */
    private function normalizeGeneratedQuestions(?array $payload, array $data): array
    {
        $rawQuestions = Arr::get($payload ?? [], 'questions', []);

        if (! is_array($rawQuestions)) {
            return [];
        }

        return collect($rawQuestions)
            ->filter(fn (mixed $row): bool => is_array($row) && filled($row['question'] ?? null) && filled($row['answer'] ?? null))
            ->map(function (array $row) use ($data): array {
                $options = collect($row['options'] ?? [])
                    ->map(fn (mixed $option): string => trim((string) $option))
                    ->filter()
                    ->values()
                    ->all();

                if ($data['type'] === 'multiple_choice') {
                    $options = array_slice($options, 0, 4);

                    if (! in_array(trim((string) $row['answer']), $options, true) && count($options) >= 2) {
                        $options[min(3, count($options) - 1)] = trim((string) $row['answer']);
                    }
                } else {
                    $options = [];
                }

                return [
                    'question' => trim((string) $row['question']),
                    'options' => $options,
                    'answer' => trim((string) $row['answer']),
                ];
            })
            ->filter(fn (array $row): bool => $data['type'] !== 'multiple_choice' || count($row['options']) >= 2)
            ->values()
            ->all();
    }
}
