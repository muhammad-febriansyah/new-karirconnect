<?php

namespace App\Http\Requests\Employer;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class OnboardingProfileRequest extends FormRequest
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
            'tagline' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'email' => ['nullable', 'email', 'max:160'],
            'phone' => ['nullable', 'string', 'max:32'],
            'industry_id' => ['nullable', 'integer', 'exists:industries,id'],
            'company_size_id' => ['nullable', 'integer', 'exists:company_sizes,id'],
            'founded_year' => ['nullable', 'integer', 'min:1800', 'max:2100'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'address' => ['nullable', 'string', 'max:500'],
            'about' => ['nullable', 'string', 'max:5000'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'industry_id' => $this->filled('industry_id') ? (int) $this->input('industry_id') : null,
            'company_size_id' => $this->filled('company_size_id') ? (int) $this->input('company_size_id') : null,
            'province_id' => $this->filled('province_id') ? (int) $this->input('province_id') : null,
            'city_id' => $this->filled('city_id') ? (int) $this->input('city_id') : null,
            'founded_year' => $this->filled('founded_year') ? (int) $this->input('founded_year') : null,
        ]);
    }
}
