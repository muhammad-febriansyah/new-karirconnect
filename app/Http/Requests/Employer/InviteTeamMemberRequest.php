<?php

namespace App\Http\Requests\Employer;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InviteTeamMemberRequest extends FormRequest
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
            'email' => [
                'required',
                'email',
                'exists:users,email',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $user = User::query()->where('email', $value)->first();

                    if (! $user?->isEmployer()) {
                        $fail('Anggota tim harus menggunakan akun employer.');
                    }
                },
            ],
            'role' => ['required', Rule::in(['recruiter', 'admin'])],
        ];
    }
}
