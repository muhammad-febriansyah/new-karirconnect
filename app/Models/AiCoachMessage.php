<?php

namespace App\Models;

use Database\Factories\AiCoachMessageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'session_id',
    'role',
    'content',
    'tokens_used',
    'model_snapshot',
])]
class AiCoachMessage extends Model
{
    /** @use HasFactory<AiCoachMessageFactory> */
    use HasFactory;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'tokens_used' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<AiCoachSession, $this>
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(AiCoachSession::class, 'session_id');
    }
}
