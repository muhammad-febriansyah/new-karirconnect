<?php

namespace App\Notifications;

use App\Models\Interview;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InterviewReminderNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Interview $interview,
        public readonly string $window = '24h',
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'fcm'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $when = $this->interview->scheduled_at?->setTimezone($this->interview->timezone)->format('l, d M Y · H:i');
        $modeLabel = $this->interview->mode?->label() ?? '-';
        $windowLabel = $this->window === '1h' ? '1 jam' : '24 jam';

        $mail = (new MailMessage)
            ->subject("Pengingat interview ({$windowLabel} lagi): {$this->interview->title}")
            ->greeting("Halo, {$notifiable->name}")
            ->line("Interview {$this->interview->title} akan dimulai dalam {$windowLabel}.")
            ->line("Jadwal: {$when} ({$this->interview->timezone}) · Mode: {$modeLabel}.");

        if ($this->interview->meeting_url) {
            $mail->line("Link meeting: {$this->interview->meeting_url}");
        }
        if ($this->interview->location_address) {
            $mail->line("Lokasi: {$this->interview->location_address}");
        }

        return $mail->action('Lihat Detail', url('/employee/interviews'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Pengingat interview',
            'body' => "{$this->interview->title} dalam {$this->window}.",
            'action_url' => '/employee/interviews',
            'icon' => 'calendar-clock',
            'interview_id' => $this->interview->id,
            'window' => $this->window,
            'scheduled_at' => optional($this->interview->scheduled_at)->toIso8601String(),
        ];
    }
}
