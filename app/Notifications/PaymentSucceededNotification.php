<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentSucceededNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly Order $order) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'fcm'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $amount = 'Rp '.number_format($this->order->amount_idr, 0, ',', '.');

        return (new MailMessage)
            ->subject('Pembayaran berhasil — '.$this->order->reference)
            ->greeting("Halo, {$notifiable->name}")
            ->line('Terima kasih, pembayaran Anda berhasil diterima.')
            ->line('Order: '.$this->order->reference)
            ->line('Item: '.$this->order->description)
            ->line("Jumlah: {$amount}")
            ->action('Lihat Detail Order', url('/employer/billing/'.$this->order->reference))
            ->line('Akses fitur akan langsung aktif. Hubungi support jika ada kendala.');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Pembayaran berhasil',
            'body' => $this->order->description.' • Rp '.number_format($this->order->amount_idr, 0, ',', '.'),
            'action_url' => '/employer/billing/'.$this->order->reference,
            'icon' => 'credit-card',
            'order_id' => $this->order->id,
            'reference' => $this->order->reference,
            'amount_idr' => $this->order->amount_idr,
        ];
    }
}
