<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Mirrors Employee\CompanyReviewController::validated(), which is a private
 * Request-coupled helper and cannot be reused.
 */
class CompanyReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isEmployee() ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'rating_management' => ['nullable', 'integer', 'between:1,5'],
            'rating_culture' => ['nullable', 'integer', 'between:1,5'],
            'rating_compensation' => ['nullable', 'integer', 'between:1,5'],
            'rating_growth' => ['nullable', 'integer', 'between:1,5'],
            'rating_balance' => ['nullable', 'integer', 'between:1,5'],
            'pros' => ['nullable', 'string', 'max:2000'],
            'cons' => ['nullable', 'string', 'max:2000'],
            'advice_to_management' => ['nullable', 'string', 'max:2000'],
            'employment_status' => ['required', Rule::in(['current', 'former'])],
            'employment_type' => ['nullable', 'string', 'max:24'],
            'job_title' => ['nullable', 'string', 'max:120'],
            'would_recommend' => ['boolean'],
            'is_anonymous' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'would_recommend' => $this->boolean('would_recommend'),
            'is_anonymous' => $this->boolean('is_anonymous'),
        ]);
    }
}
