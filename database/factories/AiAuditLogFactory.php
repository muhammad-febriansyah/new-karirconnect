<?php

namespace Database\Factories;

use App\Models\AiAuditLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiAuditLog>
 */
class AiAuditLogFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => null,
            'feature' => 'ai_interview',
            'provider' => 'fake',
            'model' => 'fake-model-1',
            'prompt_tokens' => 120,
            'completion_tokens' => 220,
            'total_cost_usd' => 0.001500,
            'latency_ms' => 350,
            'status' => 'success',
        ];
    }
}
