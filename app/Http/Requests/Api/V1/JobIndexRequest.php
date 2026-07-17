<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\EducationLevel;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\WorkArrangement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Filters for the public job listing.
 *
 * JobBrowseFilter accepts arrays for the enum filters, so each is allowed as
 * either a single value or a list.
 */
class JobIndexRequest extends FormRequest
{
    /**
     * The web listing pages at 15. Mobile gets a larger default because a phone
     * list scrolls further per fetch, and a ceiling so a caller cannot ask for
     * the whole table in one query.
     */
    private const DEFAULT_PER_PAGE = 20;

    private const MAX_PER_PAGE = 50;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:160'],
            'category_id' => ['nullable', 'integer', 'exists:job_categories,id'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],

            'employment_type' => ['nullable'],
            'employment_type.*' => [Rule::enum(EmploymentType::class)],
            'work_arrangement' => ['nullable'],
            'work_arrangement.*' => [Rule::enum(WorkArrangement::class)],
            'experience_level' => ['nullable'],
            'experience_level.*' => [Rule::enum(ExperienceLevel::class)],
            'min_education' => ['nullable'],
            'min_education.*' => [Rule::enum(EducationLevel::class)],

            'salary_min' => ['nullable', 'integer', 'min:0'],
            'skill_ids' => ['nullable', 'array'],
            'skill_ids.*' => ['integer', 'exists:skills,id'],
            'featured_only' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in(['latest', 'oldest', 'salary_desc', 'salary_asc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ];
    }

    /**
     * Normalise the enum filters to arrays so a single value and a list follow
     * the same path into the filter.
     */
    protected function prepareForValidation(): void
    {
        foreach (['employment_type', 'work_arrangement', 'experience_level', 'min_education'] as $key) {
            $value = $this->input($key);

            if ($value !== null && ! is_array($value)) {
                $this->merge([$key => [$value]]);
            }
        }
    }

    /**
     * Shaped for JobBrowseFilter::apply().
     *
     * @return array<string, mixed>
     */
    public function filters(): array
    {
        return [
            'search' => $this->string('search')->toString() ?: null,
            'category_id' => $this->integer('category_id') ?: null,
            'province_id' => $this->integer('province_id') ?: null,
            'city_id' => $this->integer('city_id') ?: null,
            'employment_type' => $this->input('employment_type') ?: null,
            'work_arrangement' => $this->input('work_arrangement') ?: null,
            'experience_level' => $this->input('experience_level') ?: null,
            'min_education' => $this->input('min_education') ?: null,
            'salary_min' => $this->integer('salary_min') ?: null,
            'skill_ids' => array_filter((array) $this->input('skill_ids', [])),
            'featured_only' => $this->boolean('featured_only') ?: null,
            'sort' => $this->string('sort')->toString() ?: 'latest',
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
