<?php

namespace App\Notifications;

use App\Models\AiInterviewSession;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AiInterviewInvitationNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly AiInterviewSession $session) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'fcm'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $job = $this->session->job;
        $deadline = $this->session->expires_at?->format('d M Y H:i');

        $mail = (new MailMessage)
            ->subject('Undangan AI Interview untuk '.($job?->title ?? 'lowongan Anda'))
            ->greeting("Halo, {$notifiable->name}")
            ->line('Anda diundang menjalani sesi AI Interview untuk lowongan '.($job?->title ?? '-').'.')
            ->line('Mode: '.$this->session->mode->label().' · Bahasa: '.strtoupper((string) $this->session->language));

        if ($deadline) {
            $mail->line("Selesaikan sebelum: {$deadline}.");
        }

        return $mail->action('Mulai Sesi AI Interview', url('/employee/ai-interviews'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Undangan AI Interview',
            'body' => 'Anda diundang menjalani AI Interview untuk '.($this->session->job?->title ?? 'lowongan').'.',
            'action_url' => '/employee/ai-interviews',
            'icon' => 'bot',
            'session_id' => $this->session->id,
            'job_title' => $this->session->job?->title,
            'expires_at' => optional($this->session->expires_at)->toIso8601String(),
        ];
    }
}
