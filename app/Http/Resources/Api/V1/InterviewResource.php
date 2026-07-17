<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Interview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Interview
 */
class InterviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'stage' => $this->stage?->value,
            'mode' => $this->mode?->value,
            'status' => $this->status?->value,
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'duration_minutes' => $this->duration_minutes,
            'timezone' => $this->timezone,
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'requires_confirmation' => (bool) $this->requires_confirmation,

            'meeting_url' => $this->meeting_url,
            'meeting_passcode' => $this->meeting_passcode,
            'location_name' => $this->location_name,
            'location_address' => $this->location_address,
            'location_map_url' => $this->location_map_url,
            'candidate_instructions' => $this->candidate_instructions,

            'job' => $this->whenLoaded('application', fn () => [
                'id' => $this->application->job?->id,
                'title' => $this->application->job?->title,
                'slug' => $this->application->job?->slug,
                'company' => $this->application->job?->company?->name,
            ]),

            'participants' => $this->whenLoaded('participants', fn () => $this->participants
                ->map(fn ($participant) => [
                    'id' => $participant->id,
                    'name' => $participant->user?->name,
                    'role' => $participant->role,
                    'invitation_response' => $participant->invitation_response,
                    'responded_at' => $participant->responded_at?->toIso8601String(),
                ])->values()->all()
            ),
        ];
    }
}
