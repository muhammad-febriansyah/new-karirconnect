<?php

namespace App\Console\Commands\Subscriptions;

use App\Enums\SubscriptionStatus;
use App\Models\CompanySubscription;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('subscriptions:expire')]
#[Description('Tandai langganan (termasuk Trial) yang sudah lewat tanggal berakhir sebagai Expired sehingga fitur otomatis terkunci.')]
class ExpireSubscriptions extends Command
{
    public function handle(): int
    {
        $expired = CompanySubscription::query()
            ->where('status', SubscriptionStatus::Active)
            ->whereNotNull('ends_at')
            ->where('ends_at', '<', now())
            ->update([
                'status' => SubscriptionStatus::Expired,
                'updated_at' => now(),
            ]);

        $this->info("Langganan kedaluwarsa ditandai: {$expired}");

        return self::SUCCESS;
    }
}
