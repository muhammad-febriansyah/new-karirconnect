<?php

namespace App\Notifications;

use App\Models\CandidateOutreachMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CandidateOutreachReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly CandidateOutreachMessage $message) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'fcm'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $companyName = $this->message->company?->name ?? '-';

        return (new MailMessage)
            ->subject("Pesan baru dari {$companyName}")
            ->greeting("Halo, {$notifiable->name}")
            ->line("{$companyName} mengirim pesan untuk Anda:")
            ->line("Subjek: {$this->message->subject}")
            ->line($this->message->body)
            ->action('Buka Inbox', url('/employee/messages'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Pesan baru dari recruiter',
            'body' => "{$this->message->company?->name} - {$this->message->subject}",
            'action_url' => '/employee/messages',
            'icon' => 'mail',
            'message_id' => $this->message->id,
            'company_id' => $this->message->company_id,
            'company_name' => $this->message->company?->name,
            'subject' => $this->message->subject,
        ];
    }
}
