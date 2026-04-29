<?php

namespace App\Models;

use Database\Factories\AiAuditLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'feature',
    'provider',
    'model',
    'prompt_tokens',
    'completion_tokens',
    'total_cost_usd',
    'input_json',
    'output_json',
    'latency_ms',
    'status',
    'error_message',
])]
class AiAuditLog extends Model
{
    /** @use HasFactory<AiAuditLogFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'input_json' => 'array',
            'output_json' => 'array',
            'prompt_tokens' => 'integer',
            'completion_tokens' => 'integer',
            'latency_ms' => 'integer',
            'total_cost_usd' => 'decimal:6',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
