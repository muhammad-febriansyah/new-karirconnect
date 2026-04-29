<?php

namespace App\Http\Requests\Applications;

use App\Enums\ApplicationStatus;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChangeApplicationStatusRequest extends FormRequest
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
            'status' => ['required', Rule::in(ApplicationStatus::values())],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
