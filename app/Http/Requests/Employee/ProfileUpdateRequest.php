<?php

namespace App\Http\Requests\Employee;

use App\Enums\ExperienceLevel;
use App\Enums\Gender;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
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
            'headline' => ['nullable', 'string', 'max:160'],
            'about' => ['nullable', 'string'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', Rule::enum(Gender::class)],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'current_position' => ['nullable', 'string', 'max:160'],
            'expected_salary_min' => ['nullable', 'integer', 'min:0'],
            'expected_salary_max' => ['nullable', 'integer', 'min:0', 'gte:expected_salary_min'],
            'experience_level' => ['nullable', Rule::enum(ExperienceLevel::class)],
            'portfolio_url' => ['nullable', 'url', 'max:255'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'github_url' => ['nullable', 'url', 'max:255'],
            'is_open_to_work' => ['required', 'boolean'],
            'visibility' => ['required', Rule::in(['public', 'recruiter_only', 'private'])],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'province_id' => $this->filled('province_id') ? (int) $this->input('province_id') : null,
            'city_id' => $this->filled('city_id') ? (int) $this->input('city_id') : null,
            'expected_salary_min' => $this->normalizeRupiah($this->input('expected_salary_min')),
            'expected_salary_max' => $this->normalizeRupiah($this->input('expected_salary_max')),
            'is_open_to_work' => $this->boolean('is_open_to_work'),
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
