<?php

namespace App\Http\Requests\Api\V1\Auth;

use App\Enums\DevicePlatform;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LoginRequest extends FormRequest
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
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string'],

            // Recorded against the refresh token so a user can recognise their
            // own sessions. Never trusted for authorization.
            'device_name' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', Rule::enum(DevicePlatform::class)],
        ];
    }
}
