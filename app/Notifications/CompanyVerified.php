<?php

namespace App\Notifications;

use App\Models\Company;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CompanyVerified extends Notification
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
            ->subject('Perusahaan Anda Telah Terverifikasi')
            ->greeting('Halo, '.$notifiable->name)
            ->line("Perusahaan {$this->company->name} sudah berhasil terverifikasi. Lencana 'Verified' kini muncul di profil perusahaan.")
            ->action('Buka Profil Perusahaan', url('/employer/company/edit'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Perusahaan terverifikasi',
            'body' => "Lencana Verified kini muncul di profil {$this->company->name}.",
            'action_url' => '/employer/company/edit',
            'icon' => 'shield',
            'company_id' => $this->company->id,
            'company_name' => $this->company->name,
        ];
    }
}
