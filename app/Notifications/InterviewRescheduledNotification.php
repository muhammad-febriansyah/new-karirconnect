<?php

namespace App\Notifications;

use App\Models\Interview;
use App\Services\Interviews\InterviewIcsExporter;
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
        return ['mail', 'database', 'fcm'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $when = $this->interview->scheduled_at?->setTimezone($this->interview->timezone)->format('l, d M Y · H:i');

        $mail = (new MailMessage)
            ->subject("Interview dijadwalkan ulang: {$this->interview->title}")
            ->greeting("Halo, {$notifiable->name}")
            ->line("Jadwal interview Anda sudah diperbarui menjadi {$when} ({$this->interview->timezone}).")
            ->action('Lihat Detail Interview', url('/employee/interviews'));

        $ics = app(InterviewIcsExporter::class)->export($this->interview);
        $mail->attachData($ics, "interview-{$this->interview->id}.ics", [
            'mime' => 'text/calendar; charset=UTF-8; method=PUBLISH',
        ]);

        return $mail;
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
