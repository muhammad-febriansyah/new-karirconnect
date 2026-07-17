<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\WorkArrangement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The web has no form request for job alerts -- validation lives in a private
 * JobAlertController::validated(Request) helper that cannot be reused. Same
 * rules, restated here as a real request.
 */
class JobAlertRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:120'],
            'keyword' => ['nullable', 'string', 'max:200'],
            'job_category_id' => ['nullable', 'integer', 'exists:job_categories,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'experience_level' => ['nullable', Rule::enum(ExperienceLevel::class)],
            'employment_type' => ['nullable', Rule::enum(EmploymentType::class)],
            'work_arrangement' => ['nullable', Rule::enum(WorkArrangement::class)],
            'salary_min' => ['nullable', 'integer', 'min:0', 'max:1000000000'],
            'frequency' => ['required', Rule::in(['instant', 'daily', 'weekly'])],
            'is_active' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'job_category_id' => $this->filled('job_category_id') ? (int) $this->input('job_category_id') : null,
            'city_id' => $this->filled('city_id') ? (int) $this->input('city_id') : null,
            'province_id' => $this->filled('province_id') ? (int) $this->input('province_id') : null,
            'salary_min' => $this->normalizeRupiah($this->input('salary_min')),

            // Defaults to active. The web merges boolean('is_active') here,
            // which turns a missing key into false -- and its `??= true`
            // fallback then never fires, so an alert created without the field
            // is silently born inactive and never sends anything.
            'is_active' => $this->has('is_active') ? $this->boolean('is_active') : true,
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
