<?php

namespace App\Http\Requests\Applications;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Employee;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cover_letter' => ['nullable', 'string', 'max:16000'],
            'expected_salary' => ['nullable', 'integer', 'min:0'],

            // The CV must belong to the applicant. A bare exists rule would let
            // any candidate attach another candidate's resume to their own
            // application just by guessing an id -- SubmitApplicationAction
            // writes candidate_cv_id straight through without an owner check.
            // A user with no profile matches nothing, which is the right answer.
            'candidate_cv_id' => [
                'nullable',
                'integer',
                Rule::exists('candidate_cvs', 'id')->where(
                    fn ($query) => $query->where('employee_profile_id', $this->user()?->employeeProfile?->id)
                ),
            ],

            'answers' => ['nullable', 'array'],
            'answers.*.question_id' => ['required_with:answers', 'integer', 'exists:job_screening_questions,id'],
            'answers.*.answer' => ['nullable'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'cover_letter' => $this->normalizeRichText($this->input('cover_letter')),
            'expected_salary' => $this->normalizeRupiah($this->input('expected_salary')),
            'candidate_cv_id' => $this->filled('candidate_cv_id') ? (int) $this->input('candidate_cv_id') : null,
        ]);
    }

    /**
     * Treat editor output that is only empty markup (e.g. "<p></p>") as null.
     */
    private function normalizeRichText(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $stripped = trim(strip_tags($value, '<img>'));

        return $stripped === '' ? null : $value;
    }

    private function normalizeRupiah(mixed $value): ?int
    {
        if (! filled($value)) {
            return null;
        }

        $digits = preg_replace('/[^\d]/', '', (string) $value);

        return $digits === '' ? null : (int) $digits;
    }
}
