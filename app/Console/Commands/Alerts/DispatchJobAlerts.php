<?php

namespace App\Console\Commands\Alerts;

use App\Services\JobAlerts\JobAlertDispatcher;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('alerts:dispatch')]
#[Description('Dispatch matching-job digest emails + notifications to users with active job alerts.')]
class DispatchJobAlerts extends Command
{
    public function handle(JobAlertDispatcher $dispatcher): int
    {
        $stats = $dispatcher->run();

        $this->info(sprintf(
            'Job alerts dispatched: %d processed, %d sent, %d matches',
            $stats['processed'],
            $stats['sent'],
            $stats['total_matches'],
        ));

        return self::SUCCESS;
    }
}
