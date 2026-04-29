<?php

namespace App\Http\Requests\Employer;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class RegisterCompanyRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:160'],
            'industry_id' => ['nullable', 'integer', 'exists:industries,id'],
            'company_size_id' => ['nullable', 'integer', 'exists:company_sizes,id'],
            'website' => ['nullable', 'url', 'max:255'],
            'email' => ['nullable', 'email', 'max:160'],
            'phone' => ['nullable', 'string', 'max:32'],
        ];
    }
}
