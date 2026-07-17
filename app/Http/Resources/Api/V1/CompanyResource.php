<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * List row for a company.
 *
 * Visibility is not decided here: only companies passing the recruiterActive()
 * scope (approved or verified, never suspended) should ever reach this class.
 *
 * @mixin Company
 */
class CompanyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'tagline' => $this->tagline,
            'industry' => $this->industry?->name,
            'city' => $this->city?->name,
            'size' => $this->size?->name,
            'logo_url' => $this->logo_path ? asset('storage/'.$this->logo_path) : null,
            'verification_status' => $this->verification_status?->value,

            // Aliased by the query as open_jobs_count (published jobs only), so
            // whenCounted('jobs') would never match it. The attribute has to be
            // probed by presence rather than by value: the model runs in strict
            // mode, so reading it on the detail endpoint -- which does not
            // withCount() -- throws MissingAttributeException instead of
            // returning null.
            'open_jobs_count' => $this->when(
                array_key_exists('open_jobs_count', $this->resource->getAttributes()),
                fn () => (int) $this->resource->getAttributes()['open_jobs_count'],
            ),
        ];
    }
}
