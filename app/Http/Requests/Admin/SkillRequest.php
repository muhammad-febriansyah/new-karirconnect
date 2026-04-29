<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

class SkillRequest extends FormRequest
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
        $skill = $this->route('skill');

        return [
            'name' => ['required', 'string', 'max:120', Rule::unique('skills', 'name')->ignore($skill)],
            'slug' => ['nullable', 'string', 'max:160', 'alpha_dash', Rule::unique('skills', 'slug')->ignore($skill)],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_active' => $this->boolean('is_active'),
            'slug' => $this->filled('slug') ? str($this->input('slug'))->slug()->value() : null,
        ]);
    }
}
