<?php

namespace App\Models;

use Database\Factories\AiCoachSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'title',
    'summary',
    'status',
    'last_message_at',
])]
class AiCoachSession extends Model
{
    /** @use HasFactory<AiCoachSessionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<AiCoachMessage, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(AiCoachMessage::class, 'session_id')->orderBy('created_at');
    }
}
