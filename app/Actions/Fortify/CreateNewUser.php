<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Enums\UserRole;
use App\Models\User;
use App\Services\Company\CompanyService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    public function __construct(private readonly CompanyService $companies) {}

    /**
     * Validate and create a newly registered user. When the requested role is
     * employer we additionally provision a Company row in pending status so the
     * employer onboarding wizard has something to load on first visit.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'role' => ['required', new Enum(UserRole::class)],
            'company_name' => [
                Rule::requiredIf(fn () => ($input['role'] ?? null) === UserRole::Employer->value),
                'nullable',
                'string',
                'max:160',
            ],
        ])->validate();

        return DB::transaction(function () use ($input): User {
            $user = User::create([
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => $input['password'],
                'role' => $input['role'],
            ]);

            if ($input['role'] === UserRole::Employer->value && filled($input['company_name'] ?? null)) {
                $this->companies->register($user, ['name' => $input['company_name']]);
            }

            return $user;
        });
    }
}
