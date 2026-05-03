<?php

namespace App\Services\Messaging;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class MessageService
{
    /**
     * Persist a message and bump the conversation's last_message_at. Sender
     * must already be a participant — gate this in the caller / policy layer.
     *
     * @param  array<array{name:string, path:string, mime:string, size:int}>|null  $attachments
     */
    public function send(
        Conversation $conversation,
        User $sender,
        string $body,
        ?array $attachments = null,
    ): Message {
        if (! $conversation->hasParticipant($sender->id)) {
            throw new AuthorizationException('Pengirim bukan peserta percakapan.');
        }

        $message = DB::transaction(function () use ($conversation, $sender, $body, $attachments): Message {
            $message = Message::query()->create([
                'conversation_id' => $conversation->id,
                'sender_user_id' => $sender->id,
                'body' => $body,
                'attachments' => $attachments,
            ]);

            $now = now();

            $conversation->forceFill(['last_message_at' => $now])->save();

            $conversation->participants()
                ->where('user_id', $sender->id)
                ->update(['last_read_at' => $now]);

            return $message->fresh();
        });

        $this->notifyOtherParticipants($conversation, $sender, $message);

        return $message;
    }

    /**
     * Fan out NewMessageNotification to every conversation participant except
     * the sender. Muted participants are skipped — they still receive the
     * message in the thread but not the bell/email ping.
     */
    private function notifyOtherParticipants(
        Conversation $conversation,
        User $sender,
        Message $message,
    ): void {
        $recipients = User::query()
            ->whereIn(
                'id',
                $conversation->participants()
                    ->where('user_id', '!=', $sender->id)
                    ->where('is_muted', false)
                    ->pluck('user_id'),
            )
            ->get();

        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send($recipients, new NewMessageNotification($conversation, $message));
    }

    /**
     * Mark all messages in a conversation as read for the given user. Only
     * touches the participant row; doesn't mutate Message::read_at because
     * read receipts are per-recipient (future feature).
     */
    public function markRead(Conversation $conversation, User $user): void
    {
        $conversation->participants()
            ->where('user_id', $user->id)
            ->update(['last_read_at' => now()]);
    }

    public function postSystemMessage(Conversation $conversation, string $body): Message
    {
        $first = $conversation->participants()->orderBy('id')->first();

        if ($first === null) {
            throw new \RuntimeException('Conversation has no participants for system message.');
        }

        return DB::transaction(function () use ($conversation, $first, $body): Message {
            $message = Message::query()->create([
                'conversation_id' => $conversation->id,
                'sender_user_id' => $first->user_id,
                'body' => $body,
                'is_system' => true,
            ]);

            $conversation->forceFill(['last_message_at' => now()])->save();

            return $message->fresh();
        });
    }
}
