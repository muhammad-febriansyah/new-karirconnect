<?php

namespace App\Http\Resources\Api\V1;

use App\Models\EmployeeProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin EmployeeProfile
 */
class EmployeeProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'headline' => $this->headline,
            'about' => $this->about,
            'date_of_birth' => $this->date_of_birth?->toDateString(),

            // Values, not labels: the client renders its own copy, and a label
            // would not survive a round trip back through the update endpoint.
            'gender' => $this->gender?->value,
            'experience_level' => $this->experience_level?->value,

            'province_id' => $this->province_id,
            'province' => $this->province?->name,
            'city_id' => $this->city_id,
            'city' => $this->city?->name,
            'current_position' => $this->current_position,
            'expected_salary_min' => $this->expected_salary_min,
            'expected_salary_max' => $this->expected_salary_max,
            'portfolio_url' => $this->portfolio_url,
            'linkedin_url' => $this->linkedin_url,
            'github_url' => $this->github_url,
            'profile_completion' => (int) $this->profile_completion,
            'is_open_to_work' => (bool) $this->is_open_to_work,
            'visibility' => $this->visibility,
            'primary_resume_id' => $this->primary_resume_id,

            'skills' => $this->whenLoaded('skills', fn () => $this->skills
                ->map(fn ($skill) => [
                    'id' => $skill->id,
                    'name' => $skill->name,
                    'level' => $skill->pivot->level ?? null,
                    'years_experience' => $skill->pivot->years_experience ?? null,
                ])->values()->all()
            ),

            'educations' => $this->whenLoaded('educations', fn () => $this->educations
                ->map(fn ($row) => [
                    'id' => $row->id,
                    'level' => $row->level,
                    'institution' => $row->institution,
                    'major' => $row->major,
                    'gpa' => $row->gpa,
                    'start_year' => $row->start_year,
                    'end_year' => $row->end_year,
                    'description' => $row->description,
                ])->values()->all()
            ),

            'work_experiences' => $this->whenLoaded('workExperiences', fn () => $this->workExperiences
                ->map(fn ($row) => [
                    'id' => $row->id,
                    'company_name' => $row->company_name,
                    'position' => $row->position,
                    'employment_type' => $row->employment_type?->value ?? $row->employment_type,
                    'start_date' => $row->start_date?->toDateString(),
                    'end_date' => $row->end_date?->toDateString(),
                    'is_current' => (bool) $row->is_current,
                    'description' => $row->description,
                ])->values()->all()
            ),

            'certifications' => $this->whenLoaded('certifications', fn () => $this->certifications
                ->map(fn ($row) => [
                    'id' => $row->id,
                    'name' => $row->name,
                    'issuer' => $row->issuer,
                    'credential_id' => $row->credential_id,
                    'credential_url' => $row->credential_url,
                    'issued_date' => $row->issued_date?->toDateString(),
                    'expires_date' => $row->expires_date?->toDateString(),
                ])->values()->all()
            ),
        ];
    }
}
