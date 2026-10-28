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
            ->subject('Verifikasi Perusahaan Berhasil — Akun Employer Siap Digunakan')
            ->greeting('Yth. '.$notifiable->name.',')
            ->line("Perusahaan {$this->company->name} telah menyelesaikan proses verifikasi dan memperoleh persetujuan KarirConnect.")
            ->line('Akun employer Anda kini dapat digunakan untuk membuat dan mempublikasikan lowongan kerja.')
            ->line("Lencana verifikasi juga telah ditambahkan pada profil {$this->company->name}.")
            ->action('Buat Lowongan', route('employer.jobs.create'))
            ->salutation('Hormat kami,\nTim KarirConnect');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Perusahaan terverifikasi',
            'body' => "Perusahaan {$this->company->name} telah diverifikasi. Akun employer kini dapat digunakan untuk memposting lowongan.",
            'action_url' => route('employer.jobs.create', absolute: false),
            'icon' => 'shield',
            'company_id' => $this->company->id,
            'company_name' => $this->company->name,
        ];
    }
}
