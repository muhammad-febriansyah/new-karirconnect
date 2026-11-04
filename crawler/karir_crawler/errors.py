"""Typed crawl failures. Each carries the error category Laravel stores."""

from __future__ import annotations


class CrawlFailure(Exception):
    category = "unknown"
    retryable = False

    def __init__(self, message: str, *, url: str | None = None, http_status: int | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.url = url
        self.http_status = http_status

    @property
    def stops_fallback(self) -> bool:
        """The source refused us. Trying another engine would be a bypass."""
        return False


class NetworkError(CrawlFailure):
    category = "network"
    retryable = True


class TimeoutFailure(CrawlFailure):
    category = "timeout"
    retryable = True


class ParseError(CrawlFailure):
    category = "parse_error"


class NotFound(CrawlFailure):
    """404/410: usually a wrong board token. Retrying will not help."""

    category = "unknown"


class RateLimited(CrawlFailure):
    category = "rate_limited"
    retryable = True

    def __init__(self, message: str, *, retry_after_s: int | None = None, **kwargs) -> None:
        super().__init__(message, **kwargs)
        self.retry_after_s = retry_after_s


class AccessRestricted(CrawlFailure):
    """403/401, login wall or robots.txt disallow."""

    category = "access_restricted"

    @property
    def stops_fallback(self) -> bool:
        return True


class CaptchaDetected(AccessRestricted):
    category = "captcha"


class SsrfBlocked(CrawlFailure):
    category = "ssrf_blocked"

    @property
    def stops_fallback(self) -> bool:
        return True
