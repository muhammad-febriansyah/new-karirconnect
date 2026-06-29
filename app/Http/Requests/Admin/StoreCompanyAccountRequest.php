<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCompanyAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->isAdmin();
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'owner_name' => ['required', 'string', 'max:120'],
            'owner_email' => ['required', 'email', 'max:160', Rule::unique('users', 'email')],
            'owner_phone' => ['nullable', 'string', 'max:32'],
            'password' => ['required', 'string', 'min:8'],
            'name' => ['required', 'string', 'max:160'],
            'website' => ['nullable', 'url', 'max:255'],
            'email' => ['nullable', 'email', 'max:160'],
            'phone' => ['nullable', 'string', 'max:32'],
            'industry_id' => ['nullable', 'integer', 'exists:industries,id'],
            'company_size_id' => ['nullable', 'integer', 'exists:company_sizes,id'],
            'mark_verified' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'owner_name' => 'nama owner',
            'owner_email' => 'email owner',
            'owner_phone' => 'telepon owner',
            'name' => 'nama perusahaan',
        ];
    }
}
