<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Application
 */
class ApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'ai_match_score' => $this->ai_match_score,
            'current_stage' => $this->current_stage?->value,
            'applied_at' => $this->applied_at?->toIso8601String(),
            'job' => $this->whenLoaded('job', fn () => [
                'id' => $this->job->id,
                'title' => $this->job->title,
                'slug' => $this->job->slug,
                'company' => $this->job->is_anonymous
                    ? ['name' => 'Confidential', 'slug' => null, 'logo_url' => null]
                    : [
                        'name' => $this->job->company?->name,
                        'slug' => $this->job->company?->slug,
                        'logo_url' => $this->job->company?->logo_path
                            ? asset('storage/'.$this->job->company->logo_path)
                            : null,
                    ],
            ]),
        ];
    }
}
