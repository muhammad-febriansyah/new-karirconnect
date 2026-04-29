<?php

namespace App\Notifications;

use App\Models\Interview;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InterviewScheduledNotification extends Notification
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
        $modeLabel = $this->interview->mode?->label() ?? '-';

        $mail = (new MailMessage)
            ->subject("Interview terjadwal: {$this->interview->title}")
            ->greeting("Halo, {$notifiable->name}")
            ->line("Anda dijadwalkan untuk {$this->interview->title} pada {$when} ({$this->interview->timezone}).")
            ->line("Mode: {$modeLabel}.");

        if ($this->interview->meeting_url) {
            $mail->line("Link meeting: {$this->interview->meeting_url}");
        }
        if ($this->interview->location_address) {
            $mail->line("Lokasi: {$this->interview->location_address}");
        }

        return $mail->action('Lihat Detail Interview', url('/employee/interviews'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $when = $this->interview->scheduled_at?->setTimezone($this->interview->timezone)->format('d M Y H:i');

        return [
            'title' => 'Interview terjadwal',
            'body' => "{$this->interview->title} pada {$when} ({$this->interview->timezone}).",
            'action_url' => '/employee/interviews',
            'icon' => 'calendar',
            'interview_id' => $this->interview->id,
            'interview_title' => $this->interview->title,
            'mode' => $this->interview->mode?->value,
            'scheduled_at' => optional($this->interview->scheduled_at)->toIso8601String(),
        ];
    }
}
