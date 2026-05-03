<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationSubmittedNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly Application $application) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'fcm'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $job = $this->application->job;
        $candidate = $this->application->employeeProfile?->user;

        return (new MailMessage)
            ->subject("Lamaran baru untuk {$job?->title}")
            ->greeting("Halo, {$notifiable->name}")
            ->line("{$candidate?->name} mengirim lamaran untuk lowongan {$job?->title}.")
            ->action('Buka Daftar Pelamar', url("/employer/applicants?job={$job?->id}"));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $job = $this->application->job;
        $candidate = $this->application->employeeProfile?->user;

        return [
            'title' => 'Lamaran baru diterima',
            'body' => "{$candidate?->name} melamar untuk {$job?->title}.",
            'action_url' => "/employer/applicants?job={$job?->id}",
            'icon' => 'send',
            'application_id' => $this->application->id,
            'job_title' => $job?->title,
            'candidate_name' => $candidate?->name,
        ];
    }
}
