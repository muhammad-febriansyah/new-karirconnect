<?php

namespace App\Console\Commands\Notifications;

use App\Enums\SubscriptionStatus;
use App\Models\CompanySubscription;
use App\Notifications\SubscriptionExpiringNotification;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('notifications:notify-expiring-subscriptions')]
#[Description('Kirim email peringatan ke owner perusahaan saat langganan tinggal 7 / 3 / 1 hari sebelum berakhir.')]
class NotifyExpiringSubscriptions extends Command
{
    private const DAYS_AHEAD = [7, 3, 1];

    public function handle(): int
    {
        $count = 0;

        foreach (self::DAYS_AHEAD as $days) {
            $count += $this->dispatchForDays($days);
        }

        $this->info("Total reminder langganan dispatched: {$count}");

        return self::SUCCESS;
    }

    private function dispatchForDays(int $days): int
    {
        $start = now()->copy()->addDays($days)->startOfDay();
        $end = now()->copy()->addDays($days)->endOfDay();

        $subscriptions = CompanySubscription::query()
            ->with(['plan', 'company.owner'])
            ->where('status', SubscriptionStatus::Active)
            ->whereBetween('ends_at', [$start, $end])
            ->get();

        $count = 0;
        foreach ($subscriptions as $sub) {
            $owner = $sub->company?->owner;
            if (! $owner) {
                continue;
            }

            $owner->notify(new SubscriptionExpiringNotification($sub, $days));
            $count++;
        }

        return $count;
    }
}
