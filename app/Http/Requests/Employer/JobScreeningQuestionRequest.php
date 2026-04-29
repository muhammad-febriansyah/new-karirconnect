<?php

namespace App\Http\Requests\Employer;

use App\Enums\ScreeningQuestionType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class JobScreeningQuestionRequest extends FormRequest
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
            'question' => ['required', 'string', 'max:500'],
            'type' => ['required', Rule::in(ScreeningQuestionType::values())],
            'options' => ['nullable', 'array'],
            'options.*' => ['string', 'max:255'],
            'is_required' => ['required', 'boolean'],
            'knockout_value' => ['nullable', 'array'],
            'knockout_value.*' => ['string', 'max:255'],
            'order_number' => ['nullable', 'integer', 'min:0', 'max:999'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $options = $this->normalizeList($this->input('options_text'));
        $knockout = $this->normalizeList($this->input('knockout_value_text'));

        $this->merge([
            'is_required' => $this->boolean('is_required'),
            'order_number' => $this->filled('order_number') ? (int) $this->input('order_number') : 0,
            'options' => $options === [] ? null : $options,
            'knockout_value' => $knockout === [] ? null : $knockout,
        ]);
    }

    /**
     * @return array<int, string>
     */
    private function normalizeList(mixed $value): array
    {
        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        return collect(explode("\n", str_replace(',', "\n", $value)))
            ->map(fn (string $item) => trim($item))
            ->filter()
            ->values()
            ->all();
    }
}
