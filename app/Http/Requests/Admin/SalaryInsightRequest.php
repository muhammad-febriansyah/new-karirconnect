<?php

namespace App\Http\Requests\Admin;

use App\Enums\ExperienceLevel;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SalaryInsightRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'job_title' => ['required', 'string', 'max:160'],
            'role_category' => ['required', 'string', 'max:120'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'experience_level' => ['required', Rule::enum(ExperienceLevel::class)],
            'min_salary' => ['required', 'integer', 'min:0'],
            'median_salary' => ['required', 'integer', 'gte:min_salary'],
            'max_salary' => ['required', 'integer', 'gte:median_salary'],
            'sample_size' => ['required', 'integer', 'min:1'],
            'source' => ['required', 'string', 'max:120'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'city_id' => $this->filled('city_id') ? (int) $this->input('city_id') : null,
            'min_salary' => $this->normalizeRupiah($this->input('min_salary')),
            'median_salary' => $this->normalizeRupiah($this->input('median_salary')),
            'max_salary' => $this->normalizeRupiah($this->input('max_salary')),
            'sample_size' => $this->filled('sample_size') ? (int) $this->input('sample_size') : null,
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
