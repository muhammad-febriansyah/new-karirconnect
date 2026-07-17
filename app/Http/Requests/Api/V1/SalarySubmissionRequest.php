<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Mirrors Employee\SalarySubmissionController::validated(), which is private
 * and Request-coupled.
 */
class SalarySubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isEmployee() ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'job_title' => ['required', 'string', 'max:200'],
            'job_category_id' => ['nullable', 'integer', 'exists:job_categories,id'],
            'company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'experience_level' => ['required', Rule::enum(ExperienceLevel::class)],
            'experience_years' => ['required', 'integer', 'between:0,40'],
            'employment_type' => ['required', Rule::enum(EmploymentType::class)],
            'salary_idr' => ['required', 'integer', 'min:1000000', 'max:1000000000'],
            'bonus_idr' => ['nullable', 'integer', 'min:0', 'max:1000000000'],
            'is_anonymous' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'job_category_id' => $this->filled('job_category_id') ? (int) $this->input('job_category_id') : null,
            'company_id' => $this->filled('company_id') ? (int) $this->input('company_id') : null,
            'city_id' => $this->filled('city_id') ? (int) $this->input('city_id') : null,
            'province_id' => $this->filled('province_id') ? (int) $this->input('province_id') : null,
            'experience_years' => $this->filled('experience_years') ? (int) $this->input('experience_years') : null,
            'salary_idr' => $this->normalizeRupiah($this->input('salary_idr')),

            // Coerced to 0, never null: salary_submissions.bonus_idr is NOT
            // NULL with a default of 0, and a column default does not apply to
            // an explicit null -- inserting one is a constraint violation.
            'bonus_idr' => $this->normalizeRupiah($this->input('bonus_idr')) ?? 0,

            'is_anonymous' => $this->boolean('is_anonymous'),
        ]);
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
