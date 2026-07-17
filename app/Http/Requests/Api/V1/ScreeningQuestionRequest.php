<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\ScreeningQuestionType;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Screening question input for the mobile API.
 *
 * Same rules as Employer\JobScreeningQuestionRequest, with one deliberate
 * difference: that request coerces a missing order_number to 0, which makes an
 * omitted position indistinguishable from an explicit first position -- so
 * every question created without one collides at 0 and the order the candidate
 * sees is arbitrary. Here it stays null, and the controller appends.
 */
class ScreeningQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Employer;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'question' => ['required', 'string', 'max:500'],
            'type' => ['required', Rule::enum(ScreeningQuestionType::class)],
            'options' => ['nullable', 'array'],
            'options.*' => ['string', 'max:255'],
            'is_required' => ['required', 'boolean'],

            // The answer that auto-rejects an applicant. Employer-only.
            'knockout_value' => ['nullable', 'array'],
            'knockout_value.*' => ['string', 'max:255'],

            'order_number' => ['nullable', 'integer', 'min:0', 'max:999'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['is_required' => $this->boolean('is_required')]);
    }
}
