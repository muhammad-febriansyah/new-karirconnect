<?php

namespace App\Http\Requests\Admin;

use App\Enums\EducationLevel;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\WorkArrangement;
use App\Models\JobSource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateScrapedJobListingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', JobSource::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:180'],
            'job_category_id' => ['nullable', 'integer', 'exists:job_categories,id'],
            'employment_type' => ['nullable', Rule::enum(EmploymentType::class)],
            'work_arrangement' => ['nullable', Rule::enum(WorkArrangement::class)],
            'experience_level' => ['nullable', Rule::enum(ExperienceLevel::class)],
            'min_education' => ['nullable', Rule::enum(EducationLevel::class)],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', Rule::exists('cities', 'id')->where('province_id', $this->input('province_id'))],
            'location_text' => ['nullable', 'string', 'max:255'],
            'salary_min' => ['nullable', 'integer', 'min:0', 'max:100000000000'],
            'salary_max' => ['nullable', 'integer', 'min:0', 'max:100000000000', 'gte:salary_min'],
            'salary_currency' => ['nullable', 'string', 'size:3', 'alpha'],
            'is_salary_visible' => ['boolean'],
            'application_deadline' => ['nullable', 'date'],
            'apply_url' => ['required', 'string', 'max:2048', 'url:http,https'],
            'contact_email' => ['nullable', 'email:rfc', 'max:191'],
            'description' => ['nullable', 'string', 'max:100000'],
            'responsibilities' => ['nullable', 'string', 'max:100000'],
            'requirements' => ['nullable', 'string', 'max:100000'],
            'benefits' => ['nullable', 'string', 'max:100000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'title' => 'judul',
            'job_category_id' => 'kategori',
            'employment_type' => 'tipe pekerjaan',
            'work_arrangement' => 'sistem kerja',
            'experience_level' => 'level',
            'min_education' => 'pendidikan minimal',
            'province_id' => 'provinsi',
            'city_id' => 'kota',
            'location_text' => 'lokasi asli',
            'salary_min' => 'gaji minimum',
            'salary_max' => 'gaji maksimum',
            'salary_currency' => 'mata uang',
            'application_deadline' => 'batas lamaran',
            'apply_url' => 'link lamaran',
            'contact_email' => 'email lamaran',
        ];
    }

    protected function prepareForValidation(): void
    {
        $nullIfBlank = fn (string $key) => filled($this->input($key)) && $this->input($key) !== 'none' ? $this->input($key) : null;

        $this->merge([
            'job_category_id' => $nullIfBlank('job_category_id'),
            'employment_type' => $nullIfBlank('employment_type'),
            'work_arrangement' => $nullIfBlank('work_arrangement'),
            'experience_level' => $nullIfBlank('experience_level'),
            'min_education' => $nullIfBlank('min_education'),
            'province_id' => $nullIfBlank('province_id'),
            'city_id' => $nullIfBlank('city_id'),
            'salary_currency' => filled($this->input('salary_currency')) ? strtoupper((string) $this->input('salary_currency')) : null,
            'is_salary_visible' => $this->boolean('is_salary_visible'),
        ]);
    }
}
