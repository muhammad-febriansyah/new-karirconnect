"""Which engines can serve which source type, and in what order."""

from __future__ import annotations

from collections.abc import Callable

from .adapters.base import Adapter
from .adapters.feeds import FeedAdapter
from .adapters.generic_html import GenericHtmlAdapter
from .adapters.greenhouse import GreenhouseAdapter
from .adapters.lever import LeverAdapter
from .adapters.sitemap import SitemapAdapter
from .engines.browser import playwright_available
from .contract import CrawlRequest

# Engines each source type may use, best first. "api" means an official
# API/feed; "http" plain HTML fetching; "browser" a headless browser.
SUPPORTED: dict[str, tuple[str, ...]] = {
    "greenhouse": ("api",),
    "lever": ("api",),
    "sitemap": ("http",),
    "generic_html": ("http", "browser"),
    "job_feed": ("api",),
    "platform": (),
}

# Implemented adapters per (source type, engine).
ADAPTERS: dict[tuple[str, str], Callable[[], Adapter]] = {
    ("greenhouse", "api"): GreenhouseAdapter,
    ("lever", "api"): LeverAdapter,
    ("job_feed", "api"): FeedAdapter,
    ("sitemap", "http"): SitemapAdapter,
    ("generic_html", "http"): lambda: GenericHtmlAdapter("http"),
    ("generic_html", "browser"): lambda: GenericHtmlAdapter("browser"),
}

# Engines that need optional software installed on the worker machine.
OPTIONAL_ENGINES: dict[str, Callable[[], bool]] = {
    "browser": playwright_available,
}


def plan(request: CrawlRequest) -> list[tuple[str, Adapter | None, str]]:
    """Ordered (engine, adapter or None, reason) list. Each engine at most once."""
    supported = SUPPORTED.get(request.source.type, ())
    steps: list[tuple[str, Adapter | None, str]] = []
    for engine in request.engines:
        if engine not in supported:
            steps.append((engine, None, "skipped"))
        elif engine == "browser" and not request.limits.browser_allowed:
            steps.append((engine, None, "skipped"))
        elif (factory := ADAPTERS.get((request.source.type, engine))) is None:
            steps.append((engine, None, "unavailable"))
        elif engine in OPTIONAL_ENGINES and not OPTIONAL_ENGINES[engine]():
            steps.append((engine, None, "unavailable"))
        else:
            steps.append((engine, factory(), "ready"))
    return steps
