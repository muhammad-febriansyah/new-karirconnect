"""Bounded retry with exponential backoff and Retry-After support."""

from __future__ import annotations

from dataclasses import dataclass

from .errors import CrawlFailure, RateLimited


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 3
    base_delay_s: float = 1.0
    max_delay_s: float = 30.0
    # Longest Retry-After we are willing to wait inside one run. Anything
    # longer ends the run and Laravel puts the source in cooldown instead.
    max_in_run_wait_s: int = 60

    def delay_for(self, failure: CrawlFailure, attempt: int) -> float | None:
        """Seconds to wait before the next attempt, or None to give up.

        `attempt` is the 1-based number of the attempt that just failed.
        """
        if not failure.retryable or attempt >= self.max_attempts:
            return None
        if isinstance(failure, RateLimited) and failure.retry_after_s is not None:
            if failure.retry_after_s > self.max_in_run_wait_s:
                return None
            return float(failure.retry_after_s)
        return min(self.max_delay_s, self.base_delay_s * (2 ** (attempt - 1)))
