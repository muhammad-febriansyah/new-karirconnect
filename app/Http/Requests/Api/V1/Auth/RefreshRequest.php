<?php

namespace App\Http\Requests\Api\V1\Auth;

use App\Enums\DevicePlatform;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RefreshRequest extends FormRequest
{
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
            'refresh_token' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', Rule::enum(DevicePlatform::class)],
        ];
    }
}
