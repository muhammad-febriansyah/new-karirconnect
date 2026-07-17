<?php

namespace App\Http\Requests\Api\V1\Auth;

use App\Actions\Fortify\CreateNewUser;
use App\Enums\DevicePlatform;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Field-level validation lives in CreateNewUser, which the web registration
 * shares. This request only covers what is specific to the mobile client, and
 * restates the role restriction so a bad value fails here with a clean 422
 * rather than deeper in the action.
 */
class RegisterRequest extends FormRequest
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
            'role' => ['required', Rule::in(CreateNewUser::selfRegisterableRoles())],
            'device_name' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', Rule::enum(DevicePlatform::class)],
        ];
    }

    /**
     * Mobile clients should not have to send a locale just to register.
     */
    protected function prepareForValidation(): void
    {
        if (! $this->filled('locale')) {
            $this->merge(['locale' => 'id']);
        }
    }
}
