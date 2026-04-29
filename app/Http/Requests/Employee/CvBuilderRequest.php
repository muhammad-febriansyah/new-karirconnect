<?php

namespace App\Http\Requests\Employee;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class CvBuilderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Employee;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'label' => ['nullable', 'string', 'max:120'],
            'personal' => ['required', 'array'],
            'personal.full_name' => ['required', 'string', 'max:160'],
            'personal.headline' => ['nullable', 'string', 'max:160'],
            'personal.email' => ['nullable', 'email', 'max:160'],
            'personal.phone' => ['nullable', 'string', 'max:32'],
            'personal.location' => ['nullable', 'string', 'max:160'],
            'personal.website' => ['nullable', 'url', 'max:255'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'experiences' => ['array'],
            'experiences.*.company' => ['required', 'string', 'max:160'],
            'experiences.*.position' => ['required', 'string', 'max:160'],
            'experiences.*.period' => ['nullable', 'string', 'max:60'],
            'experiences.*.description' => ['nullable', 'string', 'max:2000'],
            'educations' => ['array'],
            'educations.*.institution' => ['required', 'string', 'max:160'],
            'educations.*.major' => ['nullable', 'string', 'max:120'],
            'educations.*.period' => ['nullable', 'string', 'max:60'],
            'educations.*.gpa' => ['nullable', 'string', 'max:10'],
            'skills' => ['array'],
            'skills.*' => ['nullable', 'string', 'max:60'],
            'certifications' => ['array'],
            'certifications.*.name' => ['required', 'string', 'max:160'],
            'certifications.*.issuer' => ['nullable', 'string', 'max:160'],
            'certifications.*.year' => ['nullable', 'string', 'max:8'],
        ];
    }
}
