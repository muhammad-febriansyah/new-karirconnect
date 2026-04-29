<?php

namespace App\Http\Requests\Ai;

use App\Enums\AiInterviewMode;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInterviewTemplateRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
            'mode' => ['required', Rule::in(AiInterviewMode::values())],
            'language' => ['required', Rule::in(['id', 'en'])],
            'duration_minutes' => ['required', 'integer', 'between:10,120'],
            'question_count' => ['required', 'integer', 'between:3,20'],
            'system_prompt' => ['nullable', 'string', 'max:8000'],
            'job_id' => ['nullable', 'integer', 'exists:job_posts,id'],
            'is_default' => ['nullable', 'boolean'],
        ];
    }
}
