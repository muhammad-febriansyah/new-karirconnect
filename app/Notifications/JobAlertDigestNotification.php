<?php

namespace App\Notifications;

use App\Models\Job;
use App\Models\JobAlert;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;

class JobAlertDigestNotification extends Notification
{
    use Queueable;

    /**
     * @param  Collection<int, Job>  $matches
     */
    public function __construct(
        public readonly JobAlert $alert,
        public readonly Collection $matches,
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
        $count = $this->matches->count();
        $mail = (new MailMessage)
            ->subject("Lowongan baru untuk {$this->alert->name}")
            ->greeting("Halo, {$notifiable->name}")
            ->line("Kami menemukan {$count} lowongan baru sesuai alert Anda \"{$this->alert->name}\".");

        foreach ($this->matches->take(5) as $job) {
            $mail->line("• {$job->title} di ".($job->company?->name ?? '-'));
        }

        return $mail->action('Lihat Semua', url('/jobs'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Lowongan baru untuk alert Anda',
            'body' => "{$this->matches->count()} lowongan baru cocok dengan \"{$this->alert->name}\".",
            'action_url' => '/employee/job-alerts',
            'icon' => 'briefcase',
            'alert_id' => $this->alert->id,
            'alert_name' => $this->alert->name,
            'match_count' => $this->matches->count(),
            'sample_jobs' => $this->matches->take(3)->map(fn (Job $j) => [
                'id' => $j->id,
                'slug' => $j->slug,
                'title' => $j->title,
                'company' => $j->company?->name,
            ])->values()->all(),
        ];
    }
}
