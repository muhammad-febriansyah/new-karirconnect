<?php

namespace App\Notifications;

use App\Models\Interview;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InterviewRescheduledNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly Interview $interview) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $when = $this->interview->scheduled_at?->setTimezone($this->interview->timezone)->format('l, d M Y · H:i');

        return (new MailMessage)
            ->subject("Interview dijadwalkan ulang: {$this->interview->title}")
            ->greeting("Halo, {$notifiable->name}")
            ->line("Jadwal interview Anda sudah diperbarui menjadi {$when} ({$this->interview->timezone}).")
            ->action('Lihat Detail Interview', url('/employee/interviews'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $when = $this->interview->scheduled_at?->setTimezone($this->interview->timezone)->format('d M Y H:i');

        return [
            'title' => 'Interview dijadwalkan ulang',
            'body' => "Jadwal baru: {$when} ({$this->interview->timezone}).",
            'action_url' => '/employee/interviews',
            'icon' => 'calendar',
            'interview_id' => $this->interview->id,
            'interview_title' => $this->interview->title,
            'scheduled_at' => optional($this->interview->scheduled_at)->toIso8601String(),
        ];
    }
}
