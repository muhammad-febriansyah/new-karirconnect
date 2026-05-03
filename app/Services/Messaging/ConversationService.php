<?php

namespace App\Services\Messaging;

use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class ConversationService
{
    /**
     * Find an existing direct conversation between exactly the given users, or
     * create one. Used for ad-hoc 1:1 chats started from talent search or an
     * applicant detail page.
     *
     * @param  array<int>  $userIds
     */
    public function findOrCreateDirect(array $userIds, ?string $subject = null): Conversation
    {
        $userIds = array_values(array_unique(array_map('intval', $userIds)));
        sort($userIds);

        if (count($userIds) < 2) {
            throw new \InvalidArgumentException('Direct conversation requires at least two users.');
        }

        $existing = Conversation::query()
            ->where('type', 'direct')
            ->whereNull('context_type')
            ->whereHas('participants', fn (Builder $q) => $q->whereIn('user_id', $userIds), '=', count($userIds))
            ->whereDoesntHave('participants', fn (Builder $q) => $q->whereNotIn('user_id', $userIds))
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        return DB::transaction(function () use ($userIds, $subject): Conversation {
            $conversation = Conversation::query()->create([
                'type' => 'direct',
                'subject' => $subject,
            ]);

            foreach ($userIds as $userId) {
                ConversationParticipant::query()->create([
                    'conversation_id' => $conversation->id,
                    'user_id' => $userId,
                    'joined_at' => now(),
                ]);
            }

            return $conversation->fresh(['participants']);
        });
    }

    /**
     * Build a context-bound conversation (e.g. tied to an Application or
     * Interview). Idempotent — returns the existing conversation for that
     * context if one already exists.
     *
     * @param  array<int>  $userIds
     */
    public function findOrCreateForContext(
        Model $context,
        array $userIds,
        string $type = 'direct',
        ?string $subject = null,
    ): Conversation {
        $userIds = array_values(array_unique(array_map('intval', $userIds)));

        $existing = Conversation::query()
            ->where('context_type', $context::class)
            ->where('context_id', $context->getKey())
            ->first();

        if ($existing !== null) {
            $this->ensureParticipants($existing, $userIds);

            return $existing->fresh(['participants']);
        }

        return DB::transaction(function () use ($context, $userIds, $type, $subject): Conversation {
            $conversation = Conversation::query()->create([
                'type' => $type,
                'context_type' => $context::class,
                'context_id' => $context->getKey(),
                'subject' => $subject,
            ]);

            foreach ($userIds as $userId) {
                ConversationParticipant::query()->create([
                    'conversation_id' => $conversation->id,
                    'user_id' => $userId,
                    'joined_at' => now(),
                ]);
            }

            return $conversation->fresh(['participants']);
        });
    }

    /**
     * Add any missing participants to an existing conversation. Useful when
     * an interview adds an interviewer mid-flow.
     *
     * @param  array<int>  $userIds
     */
    public function ensureParticipants(Conversation $conversation, array $userIds): void
    {
        $existing = $conversation->participants()->pluck('user_id')->all();
        $missing = array_diff(array_unique($userIds), $existing);

        foreach ($missing as $userId) {
            ConversationParticipant::query()->create([
                'conversation_id' => $conversation->id,
                'user_id' => (int) $userId,
                'joined_at' => now(),
            ]);
        }
    }

    /**
     * List a user's conversations sorted by recent activity. Eager loads the
     * latest message and participant set so a list page can render in 1 query.
     */
    public function listForUser(User $user, int $perPage = 20)
    {
        return Conversation::query()
            ->whereHas('participants', fn (Builder $q) => $q->where('user_id', $user->id))
            ->with([
                'participants.user:id,name,avatar_path',
                'messages' => fn ($q) => $q->latest()->limit(1),
            ])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function unreadCount(User $user): int
    {
        return ConversationParticipant::query()
            ->where('user_id', $user->id)
            ->whereHas('conversation', function (Builder $q) {
                $q->whereColumn('conversations.last_message_at', '>', 'conversation_participants.last_read_at')
                    ->orWhereNull('conversation_participants.last_read_at');
            })
            ->count();
    }
}
