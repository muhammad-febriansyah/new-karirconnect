<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

class JobCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * @return array<string, array<int, Unique|string>|string>
     */
    public function rules(): array
    {
        $jobCategory = $this->route('job_category');

        return [
            'name' => ['required', 'string', 'max:120', Rule::unique('job_categories', 'name')->ignore($jobCategory)],
            'slug' => ['nullable', 'string', 'max:160', 'alpha_dash', Rule::unique('job_categories', 'slug')->ignore($jobCategory)],
            'description' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_active' => $this->boolean('is_active'),
            'sort_order' => $this->filled('sort_order') ? (int) $this->input('sort_order') : 0,
            'slug' => $this->filled('slug') ? str($this->input('slug'))->slug()->value() : null,
        ]);
    }
}
