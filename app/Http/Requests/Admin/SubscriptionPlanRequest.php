<?php

namespace App\Http\Requests\Admin;

use App\Enums\SubscriptionTier;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubscriptionPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->isAdmin();
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $planId = $this->route('plan')?->id;

        return [
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:120', 'alpha_dash', Rule::unique('subscription_plans', 'slug')->ignore($planId)],
            'tier' => ['required', Rule::in(array_column(SubscriptionTier::cases(), 'value'))],
            'price_idr' => ['required', 'integer', 'min:0', 'max:999999999'],
            'billing_period_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'job_post_quota' => ['required', 'integer', 'min:0'],
            'featured_credits' => ['required', 'integer', 'min:0'],
            'ai_interview_credits' => ['required', 'integer', 'min:0'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:200'],
            'is_active' => ['required', 'boolean'],
            'is_featured' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function validated($key = null, $default = null)
    {
        $data = parent::validated($key, $default);
        $data['features'] = array_values(array_filter((array) ($data['features'] ?? []), fn ($v) => filled($v)));

        return $data;
    }
}
