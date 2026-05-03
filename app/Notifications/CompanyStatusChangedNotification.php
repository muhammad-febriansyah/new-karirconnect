<?php

namespace App\Notifications;

use App\Models\Company;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CompanyStatusChangedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Company $company,
        private readonly string $message,
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
        return (new MailMessage)
            ->subject('Status perusahaan diperbarui')
            ->greeting('Halo '.$notifiable->name.',')
            ->line('Status perusahaan Anda telah diperbarui.')
            ->line('Perusahaan: '.$this->company->name)
            ->line($this->message)
            ->action('Lihat Profil Perusahaan', url('/employer/company/edit'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Status perusahaan diperbarui',
            'body' => $this->message,
            'action_url' => '/employer/company/edit',
            'icon' => 'building',
            'company_id' => $this->company->id,
            'company_name' => $this->company->name,
            'message' => $this->message,
        ];
    }
}
