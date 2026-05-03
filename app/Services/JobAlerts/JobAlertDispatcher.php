<?php

namespace App\Services\JobAlerts;

use App\Models\JobAlert;
use App\Notifications\JobAlertDigestNotification;
use Illuminate\Support\Facades\Notification;

/**
 * Walks active alerts and dispatches digest notifications for those whose
 * frequency cadence has elapsed AND that have new matches since their last
 * send. Public-method shape (`run`) is what the scheduler invokes; the
 * `dispatchOne` helper is also used by the controller's preview/test action.
 */
class JobAlertDispatcher
{
    public function __construct(private readonly JobAlertMatcherService $matcher) {}

    /**
     * @return array{processed:int, sent:int, total_matches:int}
     */
    public function run(): array
    {
        $processed = 0;
        $sent = 0;
        $totalMatches = 0;

        JobAlert::query()
            ->with('user:id,name,email')
            ->where('is_active', true)
            ->chunkById(50, function ($chunk) use (&$processed, &$sent, &$totalMatches): void {
                foreach ($chunk as $alert) {
                    $processed++;
                    if (! $alert->isDue()) {
                        continue;
                    }
                    if ($this->dispatchOne($alert) > 0) {
                        $sent++;
                        $totalMatches += $alert->fresh()->total_matches_sent - ($alert->total_matches_sent ?: 0);
                    }
                }
            });

        return [
            'processed' => $processed,
            'sent' => $sent,
            'total_matches' => $totalMatches,
        ];
    }

    /**
     * Send a single alert digest if there are matches. Returns the number of
     * matches included so callers can short-circuit when zero.
     */
    public function dispatchOne(JobAlert $alert): int
    {
        $matches = $this->matcher->match($alert);
        if ($matches->isEmpty()) {
            return 0;
        }

        $user = $alert->user;
        if (! $user) {
            return 0;
        }

        Notification::send($user, new JobAlertDigestNotification($alert, $matches));

        $alert->forceFill([
            'last_sent_at' => now(),
            'total_matches_sent' => $alert->total_matches_sent + $matches->count(),
        ])->save();

        return $matches->count();
    }
}
