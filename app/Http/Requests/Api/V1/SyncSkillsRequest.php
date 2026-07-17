<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class SyncSkillsRequest extends FormRequest
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
            'skills' => ['present', 'array', 'max:50'],
            'skills.*.id' => ['required', 'integer', 'distinct', 'exists:skills,id'],
            'skills.*.level' => ['nullable', 'string', 'max:16'],
            'skills.*.years_experience' => ['nullable', 'integer', 'min:0', 'max:60'],
        ];
    }
}
