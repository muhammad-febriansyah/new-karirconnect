<?php

namespace App\Http\Requests\Employee;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\Gender;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OnboardingStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isEmployee() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'phone' => ['nullable', 'string', 'max:32'],
            'headline' => ['nullable', 'string', 'max:160'],
            'about' => ['nullable', 'string', 'max:5000'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', Rule::enum(Gender::class)],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'current_position' => ['nullable', 'string', 'max:160'],
            'experience_level' => ['nullable', Rule::enum(ExperienceLevel::class)],
            'expected_salary_min' => ['nullable', 'integer', 'min:0'],
            'expected_salary_max' => ['nullable', 'integer', 'min:0', 'gte:expected_salary_min'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'portfolio_url' => ['nullable', 'url', 'max:255'],
            'github_url' => ['nullable', 'url', 'max:255'],
            'cv_id' => ['nullable', 'integer'],

            'skills' => ['nullable', 'array', 'max:30'],
            'skills.*' => ['nullable', 'string', 'max:80'],

            'work_experiences' => ['nullable', 'array', 'max:10'],
            'work_experiences.*.company_name' => ['nullable', 'string', 'max:255'],
            'work_experiences.*.position' => ['nullable', 'string', 'max:255'],
            'work_experiences.*.employment_type' => ['nullable', Rule::enum(EmploymentType::class)],
            'work_experiences.*.start_date' => ['nullable', 'date'],
            'work_experiences.*.end_date' => ['nullable', 'date', 'after_or_equal:work_experiences.*.start_date'],
            'work_experiences.*.is_current' => ['nullable', 'boolean'],
            'work_experiences.*.description' => ['nullable', 'string', 'max:2000'],

            'educations' => ['nullable', 'array', 'max:10'],
            'educations.*.institution' => ['nullable', 'string', 'max:255'],
            'educations.*.level' => ['nullable', 'string', 'max:32'],
            'educations.*.major' => ['nullable', 'string', 'max:255'],
            'educations.*.gpa' => ['nullable', 'numeric', 'between:0,4'],
            'educations.*.start_year' => ['nullable', 'integer', 'min:1950', 'max:2100'],
            'educations.*.end_year' => ['nullable', 'integer', 'min:1950', 'max:2100'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'province_id' => $this->filled('province_id') ? (int) $this->input('province_id') : null,
            'city_id' => $this->filled('city_id') ? (int) $this->input('city_id') : null,
            'expected_salary_min' => $this->normalizeRupiah($this->input('expected_salary_min')),
            'expected_salary_max' => $this->normalizeRupiah($this->input('expected_salary_max')),
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
