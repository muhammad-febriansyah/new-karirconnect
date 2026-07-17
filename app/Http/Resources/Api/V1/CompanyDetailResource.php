<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Company;
use Illuminate\Http\Request;

/**
 * Full company profile.
 *
 * @mixin Company
 */
class CompanyDetailResource extends CompanyResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'about' => $this->about,
            'culture' => $this->culture,
            'benefits' => $this->benefits,
            'website' => $this->website,
            'province' => $this->province?->name,
            'cover_url' => $this->cover_path ? asset('storage/'.$this->cover_path) : null,
            'founded_year' => $this->founded_year,

            'offices' => $this->whenLoaded('offices', fn () => $this->offices
                ->map(fn ($office) => [
                    'id' => $office->id,
                    'label' => $office->label,
                    'address' => $office->address,
                    'is_headquarter' => (bool) $office->is_headquarter,
                    'map_url' => $office->map_url,
                ])->values()->all()
            ),

            'badges' => $this->whenLoaded('badges', fn () => $this->badges
                ->map(fn ($badge) => [
                    'id' => $badge->id,
                    'name' => $badge->name,
                    'tone' => $badge->tone,
                ])->values()->all()
            ),
        ];
    }
}
