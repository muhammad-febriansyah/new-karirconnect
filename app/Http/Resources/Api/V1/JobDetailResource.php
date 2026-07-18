<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Job;
use Illuminate\Http\Request;

/**
 * Full job posting. Inherits the salary/anonymity masking from JobResource.
 *
 * @mixin Job
 */
class JobDetailResource extends JobResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'description' => $this->description,
            'responsibilities' => $this->responsibilities,
            'requirements' => $this->requirements,
            'benefits' => $this->benefits,
            'min_education' => $this->min_education?->value,
            'province' => $this->province?->name,

            // Withheld for the same reason as the rest of the company block:
            // an "about" blurb identifies the employer just as well as a name.
            'company_about' => $this->is_anonymous ? null : $this->company?->about,

            'screening_questions' => $this->whenLoaded('screeningQuestions', fn () => $this->screeningQuestions
                ->map(fn ($question) => [
                    'id' => $question->id,
                    'question' => $question->question,
                    'type' => $question->type?->value,
                    'is_required' => (bool) $question->is_required,
                    // The choice types (single_choice, multi_choice) are
                    // unanswerable without their options; a text/number/yes_no
                    // question has none, so this is null there.
                    'options' => $question->options,
                ])->values()->all()
            ),

            'views_count' => $this->views_count,
            'applications_count' => $this->applications_count,
        ];
    }
}
