<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class CareerResourceRequest extends FormRequest
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
        $resource = $this->route('career_resource');

        return [
            'title' => ['required', 'string', 'max:160'],
            'slug' => ['nullable', 'string', 'max:180', 'alpha_dash', Rule::unique('career_resources', 'slug')->ignore($resource)],
            'excerpt' => ['nullable', 'string'],
            'body' => ['required', 'string'],
            'thumbnail' => ['nullable', File::image()->max('4mb')],
            'category' => ['nullable', 'string', 'max:120'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['nullable', 'string', 'max:60'],
            'reading_minutes' => ['required', 'integer', 'between:1,120'],
            'is_published' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $tags = $this->input('tags', []);

        if (is_string($tags)) {
            $tags = explode(',', $tags);
        }

        $this->merge([
            'slug' => $this->filled('slug') ? str($this->input('slug'))->slug()->value() : null,
            'is_published' => $this->boolean('is_published'),
            'reading_minutes' => (int) $this->input('reading_minutes', 1),
            'tags' => collect($tags)
                ->map(static fn (mixed $value): string => trim((string) $value))
                ->filter()
                ->values()
                ->all(),
        ]);
    }
}
