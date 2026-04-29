<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationStatusChangedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Application $application,
        public readonly ?string $note = null,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $job = $this->application->job;
        $statusLabel = $this->application->status?->label() ?? '-';

        $mail = (new MailMessage)
            ->subject("Status lamaran {$job?->title} diperbarui")
            ->greeting("Halo, {$notifiable->name}")
            ->line("Status lamaran Anda untuk {$job?->title} kini: {$statusLabel}.");

        if ($this->note) {
            $mail->line("Catatan dari recruiter: {$this->note}");
        }

        return $mail->action('Lihat Detail Lamaran', url('/employee/applications'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $statusLabel = $this->application->status?->label() ?? '-';

        return [
            'title' => 'Status lamaran diperbarui',
            'body' => "Lamaran Anda untuk {$this->application->job?->title} kini: {$statusLabel}.",
            'action_url' => '/employee/applications',
            'icon' => 'badge',
            'application_id' => $this->application->id,
            'job_title' => $this->application->job?->title,
            'status' => $this->application->status?->value,
            'note' => $this->note,
        ];
    }
}
