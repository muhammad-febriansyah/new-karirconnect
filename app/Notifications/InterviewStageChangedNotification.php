<?php

namespace App\Notifications;

use App\Enums\InterviewStage;
use App\Models\Interview;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InterviewStageChangedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Interview $interview,
        public readonly ?InterviewStage $previousStage,
        public readonly InterviewStage $newStage,
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

        return (new MailMessage)
            ->subject("Tahap interview diperbarui: {$this->interview->title}")
            ->greeting("Halo, {$notifiable->name}")
            ->line("Tahap interview Anda untuk \"{$this->interview->title}\" telah diperbarui.")
            ->line("Tahap baru: **{$this->newStage->label()}**".(
                $this->previousStage ? " (sebelumnya: {$this->previousStage->label()})" : ''
            ).'.')
            ->when((bool) $when, fn (MailMessage $m) => $m->line("Jadwal: {$when} ({$this->interview->timezone})."))
            ->action('Lihat Detail Interview', url('/employee/interviews'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Tahap interview diperbarui',
            'body' => sprintf(
                '%s sekarang di tahap %s.',
                $this->interview->title,
                $this->newStage->label(),
            ),
            'action_url' => '/employee/interviews',
            'icon' => 'calendar',
            'interview_id' => $this->interview->id,
            'previous_stage' => $this->previousStage?->value,
            'new_stage' => $this->newStage->value,
        ];
    }
}
