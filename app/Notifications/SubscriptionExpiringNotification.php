<?php

namespace App\Notifications;

use App\Models\CompanySubscription;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionExpiringNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly CompanySubscription $subscription,
        public readonly int $daysRemaining,
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
        $endsAt = $this->subscription->ends_at?->format('d M Y');
        $planName = $this->subscription->plan?->name ?? 'paket Anda';

        return (new MailMessage)
            ->subject("Langganan {$planName} akan berakhir dalam {$this->daysRemaining} hari")
            ->greeting("Halo, {$notifiable->name}")
            ->line("Langganan {$planName} berakhir pada {$endsAt} (sisa {$this->daysRemaining} hari).")
            ->line('Perpanjang sekarang agar fitur premium tetap aktif tanpa jeda.')
            ->action('Perpanjang Langganan', url('/employer/billing'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Langganan akan berakhir',
            'body' => 'Sisa '.$this->daysRemaining.' hari sebelum '.($this->subscription->plan?->name ?? 'paket').' berakhir.',
            'action_url' => '/employer/billing',
            'icon' => 'credit-card',
            'subscription_id' => $this->subscription->id,
            'plan_name' => $this->subscription->plan?->name,
            'days_remaining' => $this->daysRemaining,
            'ends_at' => optional($this->subscription->ends_at)->toIso8601String(),
        ];
    }
}
