<?php

namespace App\Notifications;

use App\Models\Company;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CompanyApproved extends Notification
{
    use Queueable;

    public function __construct(public readonly Company $company) {}

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
            ->subject('Perusahaan Anda Telah Disetujui')
            ->greeting('Halo, '.$notifiable->name)
            ->line("Selamat! Perusahaan {$this->company->name} telah disetujui dan siap untuk memposting lowongan.")
            ->action('Buka Dashboard Employer', url('/employer/company/edit'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Perusahaan disetujui',
            'body' => "Perusahaan {$this->company->name} telah disetujui dan siap memposting lowongan.",
            'action_url' => '/employer/company/edit',
            'icon' => 'check',
            'company_id' => $this->company->id,
            'company_name' => $this->company->name,
        ];
    }
}
