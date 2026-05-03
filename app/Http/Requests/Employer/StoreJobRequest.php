<?php

namespace App\Http\Requests\Employer;

use App\Enums\EducationLevel;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\JobStatus;
use App\Enums\WorkArrangement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isEmployer() ?? false;
    }

    /**
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        return [
            'job_category_id' => ['required', 'integer', 'exists:job_categories,id'],
            'title' => ['required', 'string', 'max:180'],
            'slug' => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'responsibilities' => ['nullable', 'string'],
            'requirements' => ['nullable', 'string'],
            'benefits' => ['nullable', 'string'],
            'employment_type' => ['required', Rule::in(EmploymentType::values())],
            'work_arrangement' => ['required', Rule::in(WorkArrangement::values())],
            'experience_level' => ['required', Rule::in(ExperienceLevel::values())],
            'min_education' => ['nullable', Rule::in(EducationLevel::values())],
            'salary_min' => ['nullable', 'integer', 'min:0'],
            'salary_max' => ['nullable', 'integer', 'min:0', 'gte:salary_min'],
            'is_salary_visible' => ['required', 'boolean'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'status' => ['required', Rule::in(JobStatus::values())],
            'application_deadline' => ['nullable', 'date'],
            'is_anonymous' => ['required', 'boolean'],
            'is_featured' => ['required', 'boolean'],
            'ai_match_threshold' => ['nullable', 'integer', 'between:0,100'],
            'auto_invite_ai_interview' => ['required', 'boolean'],
            'skill_ids' => ['nullable', 'array'],
            'skill_ids.*' => ['integer', 'exists:skills,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'slug' => $this->filled('slug') ? str($this->input('slug'))->slug()->value() : null,
            'is_salary_visible' => $this->boolean('is_salary_visible'),
            'is_anonymous' => $this->boolean('is_anonymous'),
            'is_featured' => $this->boolean('is_featured'),
            'auto_invite_ai_interview' => $this->boolean('auto_invite_ai_interview'),
            'job_category_id' => $this->filled('job_category_id') ? (int) $this->input('job_category_id') : null,
            'province_id' => $this->filled('province_id') ? (int) $this->input('province_id') : null,
            'city_id' => $this->filled('city_id') ? (int) $this->input('city_id') : null,
            'salary_min' => $this->normalizeRupiah($this->input('salary_min')),
            'salary_max' => $this->normalizeRupiah($this->input('salary_max')),
            'ai_match_threshold' => $this->filled('ai_match_threshold') ? (int) $this->input('ai_match_threshold') : null,
            'skill_ids' => collect($this->input('skill_ids', []))
                ->filter(fn (mixed $id) => filled($id))
                ->map(fn (mixed $id) => (int) $id)
                ->unique()
                ->values()
                ->all(),
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
