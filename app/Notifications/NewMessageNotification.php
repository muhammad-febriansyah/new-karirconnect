<?php

namespace App\Notifications;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewMessageNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Conversation $conversation,
        public readonly Message $message,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'fcm'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $senderName = $this->message->sender?->name ?? 'Seseorang';
        $preview = mb_substr(strip_tags((string) $this->message->body), 0, 200);

        return (new MailMessage)
            ->subject("Pesan baru dari {$senderName}")
            ->greeting("Halo, {$notifiable->name}")
            ->line("{$senderName} mengirim pesan baru:")
            ->line('"'.$preview.'"')
            ->action('Buka Pesan', url('/conversations/'.$this->conversation->id));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $senderName = $this->message->sender?->name ?? 'Seseorang';
        $preview = mb_substr(strip_tags((string) $this->message->body), 0, 140);

        return [
            'title' => "Pesan dari {$senderName}",
            'body' => $preview,
            'action_url' => '/conversations/'.$this->conversation->id,
            'icon' => 'message-circle',
            'conversation_id' => $this->conversation->id,
            'message_id' => $this->message->id,
            'sender_id' => $this->message->sender_user_id,
            'sender_name' => $senderName,
        ];
    }
}
