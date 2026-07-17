<?php

namespace App\Http\Resources\Api\V1;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'phone' => $this->phone,
            'avatar_url' => $this->avatar_path ? asset('storage/'.$this->avatar_path) : null,
            'locale' => $this->locale,
            'is_active' => (bool) $this->is_active,
            'email_verified' => $this->email_verified_at !== null,
            'onboarding_completed' => $this->onboarding_completed_at !== null,
            'two_factor_enabled' => $this->two_factor_confirmed_at !== null,
        ];
    }
}
