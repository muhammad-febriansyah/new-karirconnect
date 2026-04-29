<?php

namespace App\Http\Requests\Employer;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCompanyRequest extends FormRequest
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
            'slug' => ['nullable', 'string', 'max:180'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'email' => ['nullable', 'email', 'max:160'],
            'phone' => ['nullable', 'string', 'max:32'],
            'industry_id' => ['nullable', 'integer', 'exists:industries,id'],
            'company_size_id' => ['nullable', 'integer', 'exists:company_sizes,id'],
            'founded_year' => ['nullable', 'integer', 'between:1900,'.(int) date('Y')],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'address' => ['nullable', 'string', 'max:500'],
            'about' => ['nullable', 'string', 'max:50000'],
            'culture' => ['nullable', 'string', 'max:50000'],
            'benefits' => ['nullable', 'string', 'max:50000'],
            'logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:1024'],
            'cover' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
            'offices' => ['nullable', 'array', 'max:10'],
            'offices.*.id' => ['nullable', 'integer'],
            'offices.*.label' => ['required_with:offices', 'string', 'max:120'],
            'offices.*.province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'offices.*.city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'offices.*.address' => ['nullable', 'string', 'max:1000'],
            'offices.*.contact_phone' => ['nullable', 'string', 'max:32'],
            'offices.*.map_url' => ['nullable', 'url', 'max:255'],
            'offices.*.is_headquarter' => ['nullable', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $offices = collect($this->input('offices', []))
            ->map(function (array $office): array {
                return [
                    'id' => filled($office['id'] ?? null) ? (int) $office['id'] : null,
                    'label' => $office['label'] ?? '',
                    'province_id' => filled($office['province_id'] ?? null) ? (int) $office['province_id'] : null,
                    'city_id' => filled($office['city_id'] ?? null) ? (int) $office['city_id'] : null,
                    'address' => $office['address'] ?? null,
                    'contact_phone' => $office['contact_phone'] ?? null,
                    'map_url' => $office['map_url'] ?? null,
                    'is_headquarter' => filter_var($office['is_headquarter'] ?? false, FILTER_VALIDATE_BOOLEAN),
                ];
            })
            ->values()
            ->all();

        $this->merge([
            'slug' => $this->filled('slug') ? str($this->input('slug'))->slug()->value() : null,
            'offices' => $offices,
        ]);
    }
}
