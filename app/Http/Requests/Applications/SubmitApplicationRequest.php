<?php

namespace App\Http\Requests\Applications;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

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
            'candidate_cv_id' => ['nullable', 'integer', 'exists:candidate_cvs,id'],
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
