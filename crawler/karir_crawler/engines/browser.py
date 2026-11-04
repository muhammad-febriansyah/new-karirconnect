"""Headless Chromium via Playwright, for career pages that only render with
JavaScript. Optional: without the `playwright` package (and its Chromium)
the strategy reports this engine as unavailable.

Safety, on top of what the HTTP client does:
  * every request the page makes goes through the SSRF guard; navigations
    must stay on the source allowlist, subresources must be public https;
  * images, media and fonts are not downloaded;
  * downloads, service workers and popups are disabled;
  * only one browser runs at a time on this machine (file lock).
"""

from __future__ import annotations

import fcntl
import importlib.util
import os
import tempfile
from urllib.parse import urlsplit

from ..classifier import detect_block_page, raise_for_status
from ..errors import CrawlFailure, NetworkError, SsrfBlocked, TimeoutFailure
from ..http import SafeClient
from ..safety import host_allowed

BLOCKED_RESOURCE_TYPES = {"image", "media", "font"}
# Containers share this directory (bin/docker-worker mounts it) so the
# one-browser-at-a-time rule holds across them, not just inside one.
LOCK_PATH = os.path.join(os.environ.get("KARIR_CRAWLER_LOCK_DIR") or tempfile.gettempdir(), "karir_crawler_browser.lock")
LOCK_WAIT_S = 60
NAVIGATION_TIMEOUT_MS = 30_000


def playwright_available() -> bool:
    return importlib.util.find_spec("playwright") is not None


def route_decision(client: SafeClient, url: str, resource_type: str, is_navigation: bool) -> str:
    """'continue' or 'abort' for one request the page wants to make."""
    scheme = urlsplit(url).scheme
    if scheme in {"data", "blob"}:
        return "continue"
    if resource_type in BLOCKED_RESOURCE_TYPES:
        return "abort"
    try:
        client.guard.check(url, require_allowlist=is_navigation)
    except SsrfBlocked:
        return "abort"
    return "continue"


class BrowserLock:
    """Process-wide lock so concurrent crawls never start two browsers."""

    def __init__(self, client: SafeClient) -> None:
        self.client = client
        self._file = None

    def __enter__(self) -> "BrowserLock":
        self._file = open(LOCK_PATH, "w")
        waited = 0.0
        while True:
            try:
                fcntl.flock(self._file, fcntl.LOCK_EX | fcntl.LOCK_NB)
                return self
            except BlockingIOError:
                if waited >= LOCK_WAIT_S or self.client.deadline.remaining() <= 1:
                    self._file.close()
                    raise TimeoutFailure("another browser crawl is still running")
                self.client.clock.sleep(1.0)
                waited += 1.0

    def __exit__(self, *exc_info: object) -> None:
        if self._file:
            fcntl.flock(self._file, fcntl.LOCK_UN)
            self._file.close()
            self._file = None


class BrowserFetcher:
    engine = "browser"

    def __init__(self, client: SafeClient) -> None:
        self.client = client
        self._lock = BrowserLock(client)
        self._playwright = None
        self._browser = None
        self._context = None
        self._blocked: list[str] = []

    def __enter__(self) -> "BrowserFetcher":
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import sync_playwright

        self._lock.__enter__()
        try:
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(headless=True, args=["--disable-dev-shm-usage"])
            self._context = self._browser.new_context(
                user_agent=self.client.user_agent,
                accept_downloads=False,
                service_workers="block",
                java_script_enabled=True,
            )
            self._context.route("**/*", self._route)
            self._context.on("page", lambda page: page.on("popup", lambda popup: popup.close()))
        except PlaywrightError as exc:
            self.close()
            raise CrawlFailure(f"browser could not start: {exc}") from exc
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()

    def _route(self, route) -> None:
        request = route.request
        navigation = request.is_navigation_request()
        main_frame = navigation and request.frame.parent_frame is None
        # Third-party iframes (an invisible reCAPTCHA, a video embed) are
        # never needed to read a job page: drop them without failing.
        if navigation and not main_frame:
            if route_decision(self.client, request.url, request.resource_type, True) == "abort":
                route.abort("blockedbyclient")
                return
        decision = route_decision(self.client, request.url, request.resource_type, main_frame)
        if decision == "abort":
            if main_frame:
                self._blocked.append(request.url)
            route.abort("blockedbyclient")
        else:
            route.continue_()

    def html(self, url: str) -> tuple[str, str]:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import TimeoutError as PlaywrightTimeout

        self.client.before_request(url)
        page = self._context.new_page()
        try:
            timeout = min(NAVIGATION_TIMEOUT_MS, max(1000, int(self.client.deadline.remaining() * 1000)))
            response = page.goto(url, wait_until="networkidle", timeout=timeout)
            if self._blocked:
                blocked, self._blocked = self._blocked[0], []
                raise SsrfBlocked(f"page navigated to a blocked URL: {blocked}", url=blocked)
            if response is None:
                raise NetworkError("browser got no response", url=url)
            final_url = page.url
            if not host_allowed(urlsplit(final_url).hostname or "", self.client.guard.allowed_domains):
                raise SsrfBlocked(f"page ended on a host outside the allowlist: {final_url}", url=final_url)
            markup = page.content()
            raise_for_status(response.status, {k.lower(): v for k, v in response.headers.items()}, lambda: markup, final_url)
            blocked_page = detect_block_page(markup)
            if blocked_page is not None:
                raise blocked_page("page shows a CAPTCHA or login wall", url=final_url, http_status=response.status)
            return final_url, markup
        except PlaywrightTimeout as exc:
            raise TimeoutFailure(f"page did not finish loading: {exc}", url=url) from exc
        except PlaywrightError as exc:
            raise NetworkError(f"browser error: {exc}", url=url) from exc
        finally:
            page.close()

    def close(self) -> None:
        for closer in (
            lambda: self._context and self._context.close(),
            lambda: self._browser and self._browser.close(),
            lambda: self._playwright and self._playwright.stop(),
        ):
            try:
                closer()
            except Exception:  # noqa: BLE001 - best effort teardown
                pass
        self._context = self._browser = self._playwright = None
        self._lock.__exit__(None, None, None)
