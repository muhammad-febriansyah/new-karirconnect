<?php

namespace App\Services\Crawler;

use App\Enums\CircuitState;
use App\Enums\CrawlRunStatus;
use App\Models\JobSource;

/**
 * Per-source breaker. After `threshold` failed runs in a row the circuit
 * opens and the scheduler skips the source until `circuit_open_until`.
 * The first run after that is a half-open trial: success closes the
 * circuit, failure opens it again straight away.
 */
class CircuitBreaker
{
    public function beforeRun(JobSource $source): void
    {
        if ($source->circuit_state === CircuitState::Open
            && ($source->circuit_open_until === null || $source->circuit_open_until->isPast())) {
            $source->circuit_state = CircuitState::HalfOpen;
        }
    }

    public function afterRun(JobSource $source, CrawlRunStatus $status): void
    {
        if ($status === CrawlRunStatus::Cancelled) {
            return;
        }

        if (! $status->isFailure()) {
            $source->consecutive_failures = 0;
            $source->circuit_state = CircuitState::Closed;
            $source->circuit_open_until = null;

            return;
        }

        $source->consecutive_failures++;
        $threshold = max(1, (int) config('crawler.circuit_breaker.threshold'));

        if ($source->circuit_state === CircuitState::HalfOpen || $source->consecutive_failures >= $threshold) {
            $source->circuit_state = CircuitState::Open;
            $source->circuit_open_until = now()->addMinutes((int) config('crawler.circuit_breaker.open_minutes'));
        }
    }
}
