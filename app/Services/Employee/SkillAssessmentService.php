<?php

namespace App\Services\Employee;

use App\Models\AssessmentQuestion;
use App\Models\EmployeeProfile;
use App\Models\Skill;
use App\Models\SkillAssessment;
use App\Models\SkillAssessmentAnswer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Skill assessments: starting one, and scoring the answers.
 *
 * Extracted from Employee\SkillAssessmentController so the web and the mobile
 * API score identically. The matching rules are the reason: correct_answer is
 * stored in two historical shapes, comparison is trimmed and case-insensitive,
 * and a second copy of that would eventually mark the same answer right on one
 * surface and wrong on the other.
 */
class SkillAssessmentService
{
    /**
     * Questions served per assessment.
     */
    private const QUESTIONS_PER_ASSESSMENT = 5;

    /**
     * How long a candidate has to finish once started.
     */
    private const TIME_LIMIT_MINUTES = 60;

    /**
     * Start an assessment, or hand back the one already in progress.
     *
     * @throws ValidationException when the skill has no active questions
     */
    public function start(EmployeeProfile $profile, Skill $skill): SkillAssessment
    {
        $questionCount = AssessmentQuestion::query()
            ->where('skill_id', $skill->id)
            ->where('is_active', true)
            ->count();

        if ($questionCount === 0) {
            throw ValidationException::withMessages([
                'skill_id' => 'Belum ada soal aktif untuk skill ini.',
            ]);
        }

        // Resuming rather than starting again, so a candidate cannot reroll the
        // question set by hitting start twice.
        $active = SkillAssessment::query()
            ->where('employee_profile_id', $profile->id)
            ->where('skill_id', $skill->id)
            ->where('status', 'in_progress')
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->latest('id')
            ->first();

        if ($active !== null) {
            return $active;
        }

        return SkillAssessment::query()->create([
            'employee_profile_id' => $profile->id,
            'skill_id' => $skill->id,
            'status' => 'in_progress',
            'total_questions' => min(self::QUESTIONS_PER_ASSESSMENT, $questionCount),
            'correct_answers' => 0,
            'started_at' => now(),
            'expires_at' => now()->addMinutes(self::TIME_LIMIT_MINUTES),
        ]);
    }

    /**
     * Score a submission and close the assessment.
     *
     * @param  array<string, array{value?: string|null, time_spent_seconds?: int|null}>  $answers
     *
     * @throws ValidationException when the time limit has passed
     */
    public function submit(SkillAssessment $assessment, array $answers): SkillAssessment
    {
        if ($assessment->status === 'completed') {
            return $assessment;
        }

        if ($assessment->expires_at instanceof Carbon && $assessment->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'answers' => 'Waktu assessment ini sudah habis.',
            ]);
        }

        $questions = $this->questionsFor($assessment);
        $payloads = collect($answers);
        $correct = 0;

        foreach ($questions as $question) {
            $payload = $payloads->get((string) $question->id, []);
            $normalized = ['value' => trim((string) data_get($payload, 'value', ''))];
            $isCorrect = $this->matches($question, $normalized);

            SkillAssessmentAnswer::query()->updateOrCreate(
                ['assessment_id' => $assessment->id, 'question_id' => $question->id],
                [
                    'answer' => $normalized,
                    'is_correct' => $isCorrect,
                    'time_spent_seconds' => data_get($payload, 'time_spent_seconds'),
                    'created_at' => now(),
                ],
            );

            if ($isCorrect) {
                $correct++;
            }
        }

        $total = max($questions->count(), 1);

        $assessment->update([
            'status' => 'completed',
            'correct_answers' => $correct,
            'total_questions' => $questions->count(),
            'score' => (int) round(($correct / $total) * 100),
            'completed_at' => now(),
        ]);

        return $assessment->fresh();
    }

    /**
     * @return Collection<int, AssessmentQuestion>
     */
    public function questionsFor(SkillAssessment $assessment): Collection
    {
        return AssessmentQuestion::query()
            ->where('skill_id', $assessment->skill_id)
            ->where('is_active', true)
            ->orderBy('id')
            ->limit($assessment->total_questions)
            ->get();
    }

    /**
     * Trimmed, case-insensitive comparison against every accepted answer.
     */
    public function matches(AssessmentQuestion $question, array $answer): bool
    {
        $actual = str(trim((string) data_get($answer, 'value', '')))->lower()->value();

        if ($actual === '') {
            return false;
        }

        foreach ($this->expectedValues($question) as $expected) {
            $normalized = str(trim((string) $expected))->lower()->value();

            if ($normalized !== '' && $normalized === $actual) {
                return true;
            }
        }

        return false;
    }

    /**
     * Flatten the stored correct_answer into a list of accepted strings.
     *
     * Handles both shapes in the data: the legacy ["A. Pilihan A"] array and
     * the newer {"value": "..."} object.
     *
     * @return list<string>
     */
    public function expectedValues(AssessmentQuestion $question): array
    {
        $raw = $question->correct_answer;

        if ($raw === null) {
            return [];
        }

        if (is_string($raw)) {
            return [$raw];
        }

        if (is_array($raw)) {
            if (array_key_exists('value', $raw)) {
                $value = $raw['value'];

                return is_array($value) ? array_map('strval', $value) : [(string) $value];
            }

            return array_values(array_map('strval', $raw));
        }

        return [(string) $raw];
    }
}
