<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class CompanyIndexRequest extends FormRequest
{
    private const DEFAULT_PER_PAGE = 20;

    private const MAX_PER_PAGE = 50;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:160'],
            'industry_id' => ['nullable', 'integer', 'exists:industries,id'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'verified_only' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ];
    }

    public function perPage(): int
    {
        return min(
            $this->integer('per_page') ?: self::DEFAULT_PER_PAGE,
            self::MAX_PER_PAGE,
        );
    }
}
