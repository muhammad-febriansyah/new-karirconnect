<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Job;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * List row for a job posting.
 *
 * Mirrors Public\JobBrowseController::browseRow(), which is the contract the
 * web UI already renders. Two masking rules are load-bearing and must survive
 * anywhere a job is serialized:
 *
 *  - salary is withheld unless is_salary_visible
 *  - the employer is withheld entirely when is_anonymous
 *
 * They live here, rather than at each call site, so a new endpoint cannot leak
 * by forgetting them.
 *
 * @mixin Job
 */
class JobResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'employment_type' => $this->employment_type?->value,
            'work_arrangement' => $this->work_arrangement?->value,
            'experience_level' => $this->experience_level?->value,
            'is_featured' => (bool) $this->is_featured,
            'is_anonymous' => (bool) $this->is_anonymous,
            'salary_min' => $this->is_salary_visible ? $this->salary_min : null,
            'salary_max' => $this->is_salary_visible ? $this->salary_max : null,
            'is_salary_visible' => (bool) $this->is_salary_visible,
            'published_at' => $this->published_at?->toIso8601String(),
            'application_deadline' => $this->application_deadline?->toDateString(),
            'company' => $this->companyPayload(),
            'category' => $this->category?->name,
            'city' => $this->city?->name,
            'skills' => $this->relationLoaded('skills')
                ? $this->skills->take(5)->map(fn ($skill) => $skill->name)->values()->all()
                : [],
        ];
    }

    /**
     * An anonymous posting must not identify the employer, not even by id or
     * slug: either would resolve straight back to the company via the public
     * company endpoint.
     *
     * @return array<string, mixed>
     */
    protected function companyPayload(): array
    {
        if ($this->is_anonymous) {
            return [
                'name' => 'Confidential',
                'logo_url' => null,
                'verification_status' => null,
            ];
        }

        return [
            'id' => $this->company?->id,
            'name' => $this->company?->name,
            'slug' => $this->company?->slug,
            'logo_url' => $this->company?->logo_path
                ? asset('storage/'.$this->company->logo_path)
                : null,
            'verification_status' => $this->company?->verification_status?->value,
        ];
    }
}
