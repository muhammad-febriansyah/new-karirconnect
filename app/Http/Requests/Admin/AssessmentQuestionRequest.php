<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssessmentQuestionRequest extends FormRequest
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
            'skill_id' => ['required', 'integer', 'exists:skills,id'],
            'type' => ['required', Rule::in(['multiple_choice', 'text'])],
            'question' => ['required', 'string'],
            'options' => [Rule::when(
                $this->input('type') === 'multiple_choice',
                ['required', 'array', 'min:2'],
                ['nullable', 'array'],
            )],
            'options.*' => ['nullable', 'string', 'max:255'],
            'correct_answer' => ['required', 'array'],
            'correct_answer.value' => ['required', 'string', 'max:1000'],
            'difficulty' => ['required', Rule::in(['easy', 'medium', 'hard'])],
            'time_limit_seconds' => ['required', 'integer', 'between:30,3600'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $correctAnswer = $this->input('correct_answer');

        $this->merge([
            'is_active' => $this->boolean('is_active'),
            'time_limit_seconds' => (int) $this->input('time_limit_seconds', 300),
            'options' => collect($this->input('options', []))
                ->map(static fn (mixed $value): string => trim((string) $value))
                ->filter()
                ->values()
                ->all(),
            'correct_answer' => is_array($correctAnswer)
                ? $correctAnswer
                : ['value' => trim((string) $correctAnswer)],
        ]);
    }
}
