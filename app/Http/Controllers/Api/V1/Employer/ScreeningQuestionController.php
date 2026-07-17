<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ScreeningQuestionRequest;
use App\Models\Job;
use App\Models\JobScreeningQuestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Screening questions attached to a job.
 *
 * Candidates already answer these when applying, so without these endpoints an
 * employer on mobile could receive screening answers but never author the
 * questions that produce them.
 */
class ScreeningQuestionController extends Controller
{
    use ResolvesEmployerCompany;

    public function index(Request $request, Job $job): JsonResponse
    {
        $this->authorizeJob($request, $job);

        $questions = $job->screeningQuestions()
            ->orderBy('order_number')
            ->get()
            ->map(fn (JobScreeningQuestion $question) => $this->present($question));

        return response()->json(['data' => $questions]);
    }

    public function store(ScreeningQuestionRequest $request, Job $job): JsonResponse
    {
        $this->authorizeJob($request, $job);

        $data = $request->validated();

        // Appended when the client does not pick a position, so questions keep
        // a stable order instead of all landing on 0.
        $data['order_number'] ??= (int) $job->screeningQuestions()->max('order_number') + 1;

        $question = $job->screeningQuestions()->create($data);

        return response()->json(['data' => $this->present($question)], 201);
    }

    public function update(ScreeningQuestionRequest $request, Job $job, JobScreeningQuestion $screeningQuestion): JsonResponse
    {
        $this->authorizeJob($request, $job);

        abort_unless($screeningQuestion->job_id === $job->id, 404);

        $screeningQuestion->update($request->validated());

        return response()->json(['data' => $this->present($screeningQuestion->fresh())]);
    }

    public function destroy(Request $request, Job $job, JobScreeningQuestion $screeningQuestion): JsonResponse
    {
        $this->authorizeJob($request, $job);

        abort_unless($screeningQuestion->job_id === $job->id, 404);

        $screeningQuestion->delete();

        return response()->json(['message' => 'Pertanyaan screening dihapus.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(JobScreeningQuestion $question): array
    {
        return [
            'id' => $question->id,
            'question' => $question->question,
            'type' => $question->type?->value,
            'options' => $question->options,
            'is_required' => (bool) $question->is_required,

            // The value that auto-rejects an applicant. Employer-side only --
            // JobDetailResource never exposes it to candidates.
            'knockout_value' => $question->knockout_value,

            'order_number' => $question->order_number,
        ];
    }
}
