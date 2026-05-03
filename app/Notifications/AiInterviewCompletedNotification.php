<?php

namespace App\Notifications;

use App\Models\AiInterviewSession;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AiInterviewCompletedNotification extends Notification
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
        $candidate = $this->session->candidateProfile?->user;
        $job = $this->session->job;
        $score = $this->session->analysis?->overall_score;

        $mail = (new MailMessage)
            ->subject('Hasil AI Interview siap: '.($candidate?->name ?? 'kandidat'))
            ->greeting("Halo, {$notifiable->name}")
            ->line(($candidate?->name ?? 'Kandidat').' menyelesaikan AI Interview untuk '.($job?->title ?? 'lowongan').'.');

        if ($score !== null) {
            $mail->line("Skor keseluruhan: {$score}/100.");
        }

        return $mail->action('Lihat Hasil Lengkap', url('/employer/ai-interviews/'.$this->session->id));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'AI Interview selesai',
            'body' => ($this->session->candidateProfile?->user?->name ?? 'Kandidat').' menyelesaikan sesi AI Interview.',
            'action_url' => '/employer/ai-interviews/'.$this->session->id,
            'icon' => 'bot',
            'session_id' => $this->session->id,
            'candidate_name' => $this->session->candidateProfile?->user?->name,
            'overall_score' => $this->session->analysis?->overall_score,
        ];
    }
}
