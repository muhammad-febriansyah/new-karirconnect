<?php

namespace App\Http\Requests\Admin;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\WorkArrangement;
use App\Models\JobSource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublishExternalJobsRequest extends FormRequest
{
    public const MAX_PER_REQUEST = 500;

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
            // Either explicit ids (checkbox selection) ...
            'listing_ids' => ['required_without:all_matching', 'array', 'max:'.self::MAX_PER_REQUEST],
            'listing_ids.*' => ['integer', 'distinct', 'exists:scraped_job_listings,id'],
            // ... or every listing matching the current filters / crawl runs.
            'all_matching' => ['boolean'],
            'filters' => ['array'],
            'filters.status' => ['nullable', 'string'],
            'filters.source' => ['nullable', 'integer'],
            'filters.category' => ['nullable', 'integer'],
            'filters.search' => ['nullable', 'string', 'max:200'],
            'filters.published' => ['nullable', 'string', 'in:yes,no'],
            'filters.runs' => ['nullable', 'array', 'max:50'],
            'filters.runs.*' => ['integer'],
            'job_category_id' => ['nullable', 'integer', 'exists:job_categories,id'],
            'employment_type' => ['required', Rule::enum(EmploymentType::class)],
            'work_arrangement' => ['required', Rule::enum(WorkArrangement::class)],
            'experience_level' => ['required', Rule::enum(ExperienceLevel::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'listing_ids' => 'lowongan yang dipilih',
            'job_category_id' => 'kategori default',
            'employment_type' => 'tipe pekerjaan default',
            'work_arrangement' => 'sistem kerja default',
            'experience_level' => 'level default',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['listing_ids.required_without' => 'Pilih minimal satu lowongan untuk dipublish.'];
    }
}
