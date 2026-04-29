<?php

namespace App\Http\Requests\Interviews;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitScorecardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Employer;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'overall_score' => ['required', 'integer', 'between:1,5'],
            'recommendation' => ['required', Rule::in(['strong_yes', 'yes', 'no', 'strong_no'])],
            'criteria_scores' => ['nullable', 'array'],
            'criteria_scores.*' => ['integer', 'between:1,5'],
            'strengths' => ['nullable', 'string', 'max:2000'],
            'weaknesses' => ['nullable', 'string', 'max:2000'],
            'comments' => ['nullable', 'string', 'max:8000'],
        ];
    }
}
