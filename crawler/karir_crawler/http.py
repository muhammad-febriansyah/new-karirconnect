"""The only way the worker talks to the network.

Every request goes through: deadline check -> SSRF guard -> robots.txt ->
per-host throttle -> fetch (no automatic redirects) -> classify -> retry.
Redirects are followed by hand so each hop is checked by the guard again.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser

import httpx

from .classifier import raise_for_response
from .errors import AccessRestricted, CrawlFailure, NetworkError, ParseError, TimeoutFailure
from .retry import RetryPolicy
from .safety import UrlGuard

MAX_REDIRECTS = 5
MAX_BODY_BYTES = 10 * 1024 * 1024
REQUEST_TIMEOUT_S = 20.0


@dataclass
class Clock:
    monotonic: Callable[[], float] = time.monotonic
    sleep: Callable[[float], None] = time.sleep


@dataclass
class Deadline:
    clock: Clock
    seconds: float
    started: float = field(init=False)

    def __post_init__(self) -> None:
        self.started = self.clock.monotonic()

    def remaining(self) -> float:
        return self.seconds - (self.clock.monotonic() - self.started)

    def check(self, url: str | None = None) -> None:
        if self.remaining() <= 0:
            raise TimeoutFailure(f"run exceeded its {int(self.seconds)}s budget", url=url)


class Throttle:
    """Minimum spacing between requests to the same host."""

    def __init__(self, rate_per_minute: int, clock: Clock) -> None:
        self.interval = 60.0 / max(1, rate_per_minute)
        self.clock = clock
        self.crawl_delays: dict[str, float] = {}
        self._last: dict[str, float] = {}

    def wait(self, host: str) -> None:
        interval = max(self.interval, self.crawl_delays.get(host, 0.0))
        last = self._last.get(host)
        if last is not None:
            gap = interval - (self.clock.monotonic() - last)
            if gap > 0:
                self.clock.sleep(gap)
        self._last[host] = self.clock.monotonic()


class SafeClient:
    def __init__(
        self,
        guard: UrlGuard,
        *,
        user_agent: str,
        rate_per_minute: int,
        deadline: Deadline,
        respect_robots: bool = True,
        retry: RetryPolicy | None = None,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.guard = guard
        self.user_agent = user_agent
        self.deadline = deadline
        self.clock = deadline.clock
        self.respect_robots = respect_robots
        self.retry = retry or RetryPolicy()
        self.throttle = Throttle(rate_per_minute, self.clock)
        self.requests = 0
        self._robots: dict[str, RobotFileParser | None] = {}
        self._http = httpx.Client(
            headers={"User-Agent": user_agent, "Accept": "application/json, text/html;q=0.9, */*;q=0.5"},
            timeout=REQUEST_TIMEOUT_S,
            follow_redirects=False,
            transport=transport,
        )

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "SafeClient":
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()

    def get_json(self, url: str, params: dict | None = None):
        response = self.get(url, params=params)
        try:
            return response.json()
        except ValueError as exc:
            raise ParseError(f"response is not valid JSON: {exc}", url=str(response.url)) from exc

    def get_text(self, url: str) -> str:
        return self.get(url).text

    def get(self, url: str, params: dict | None = None) -> httpx.Response:
        if params:
            url = str(httpx.URL(url, params=params))

        attempt = 0
        while True:
            attempt += 1
            try:
                return self._fetch_following_redirects(url)
            except CrawlFailure as failure:
                delay = self.retry.delay_for(failure, attempt)
                if delay is None or delay >= self.deadline.remaining():
                    raise
                self.clock.sleep(delay)

    def _fetch_following_redirects(self, url: str) -> httpx.Response:
        for _ in range(MAX_REDIRECTS + 1):
            response = self._fetch_once(url)
            if not response.is_redirect:
                raise_for_response(response)
                return response
            location = response.headers.get("location")
            if not location:
                raise NetworkError("redirect without Location header", url=url, http_status=response.status_code)
            url = urljoin(url, location)
        raise NetworkError(f"more than {MAX_REDIRECTS} redirects", url=url)

    def _fetch_once(self, url: str, *, robots: bool = True) -> httpx.Response:
        self.deadline.check(url)
        host = self.guard.check(url)
        if robots and self.respect_robots:
            self._enforce_robots(url)
        self.throttle.wait(host)
        self.deadline.check(url)

        self.requests += 1
        try:
            response = self._http.get(url)
        except httpx.TimeoutException as exc:
            raise TimeoutFailure(f"request timed out: {exc}", url=url) from exc
        except httpx.TransportError as exc:
            raise NetworkError(f"network error: {exc}", url=url) from exc

        if len(response.content) > MAX_BODY_BYTES:
            raise ParseError(f"response larger than {MAX_BODY_BYTES} bytes", url=url)
        return response

    def before_request(self, url: str) -> str:
        """Deadline, SSRF guard, robots.txt and throttle for a request made
        outside this client (the browser engine). Returns the host."""
        self.deadline.check(url)
        host = self.guard.check(url)
        if self.respect_robots:
            self._enforce_robots(url)
        self.throttle.wait(host)
        self.deadline.check(url)
        self.requests += 1
        return host

    def _enforce_robots(self, url: str) -> None:
        parts = urlsplit(url)
        origin = f"{parts.scheme}://{parts.netloc}"
        if origin not in self._robots:
            self._robots[origin] = self._load_robots(origin)
        parser = self._robots[origin]
        if parser is None:
            return
        if not parser.can_fetch(self.user_agent, url):
            raise AccessRestricted("robots.txt disallows this URL", url=url)

    def _load_robots(self, origin: str) -> RobotFileParser | None:
        robots_url = f"{origin}/robots.txt"
        response = self._fetch_once(robots_url, robots=False)
        status = response.status_code
        # RFC 9309: 4xx means "no rules"; 5xx/unreachable means "assume disallow".
        if 400 <= status < 500 or response.is_redirect:
            return None
        if status >= 500:
            raise NetworkError(f"robots.txt unreachable (HTTP {status})", url=robots_url, http_status=status)

        parser = RobotFileParser()
        parser.parse(response.text.splitlines())
        delay = parser.crawl_delay(self.user_agent)
        if delay:
            host = urlsplit(origin).hostname or ""
            self.throttle.crawl_delays[host] = float(delay)
        return parser
