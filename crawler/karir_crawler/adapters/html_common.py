"""Shared crawl loop for HTML-based sources (sitemap, career pages).

Budget: every page fetched counts against `limits.max_pages`. Running out
marks the result truncated (the run becomes `partial`). A detail page that
fails is a non-fatal warning; a refusal (403, CAPTCHA, robots) stops the
crawl straight away and keeps what was already read.
"""

from __future__ import annotations

import re
from urllib.parse import urlsplit

from ..company import extract_company_profile
from ..contract import CompanyProfile, CrawlRequest, JobItem
from ..errors import CrawlFailure, ParseError, RateLimited
from ..extract import clean_url, extract_postings
from ..safety import host_allowed
from .base import AdapterResult, fetch_profile_page, warning_from

MAX_PATTERN_LENGTH = 200


class Budget:
    def __init__(self, request: CrawlRequest, result: AdapterResult) -> None:
        self.left = request.limits.max_pages
        self.max_items = request.limits.max_items
        self.result = result

    def take(self) -> bool:
        if self.left <= 0:
            self.result.truncated = True
            return False
        self.left -= 1
        self.result.pages += 1
        return True

    def items_full(self) -> bool:
        if len(self.result.items) >= self.max_items:
            self.result.truncated = True
            return True
        return False


def url_pattern(request: CrawlRequest) -> re.Pattern | None:
    raw = request.source.config.get("url_pattern")
    if not raw:
        return None
    if not isinstance(raw, str) or len(raw) > MAX_PATTERN_LENGTH:
        raise ParseError("config.url_pattern must be a short regular expression")
    try:
        return re.compile(raw)
    except re.error as exc:
        raise ParseError(f"config.url_pattern is not a valid regular expression: {exc}") from exc


def selectors(request: CrawlRequest) -> dict[str, str] | None:
    raw = request.source.config.get("selectors")
    if not isinstance(raw, dict):
        return None
    clean = {key: value for key, value in raw.items() if isinstance(value, str) and value.strip()}
    return clean or None


def same_source(url: str, request: CrawlRequest) -> bool:
    parts = urlsplit(url)
    return parts.scheme == "https" and host_allowed(parts.hostname or "", request.source.allowed_domains)


def is_stop(failure: CrawlFailure) -> bool:
    """Failures that end the whole crawl instead of skipping one page."""
    return failure.stops_fallback or isinstance(failure, RateLimited)


def unread_first(urls: list[str], request: CrawlRequest) -> list[str]:
    """Pages not read in recent runs come first, keeping the original order."""
    if not request.recently_seen:
        return urls
    recent = {clean_url(url) for url in request.recently_seen}
    fresh = [url for url in urls if clean_url(url) not in recent]
    old = [url for url in urls if clean_url(url) in recent]
    return fresh + old


def crawl_detail_pages(fetcher, urls: list[str], request: CrawlRequest, result: AdapterResult, budget: Budget, seen: set[str]) -> None:
    rules = selectors(request)
    for url in unread_first(urls, request):
        if budget.items_full() or result.interrupted_by is not None:
            return
        url = clean_url(url)
        if url in seen:
            continue
        seen.add(url)
        # Stop cleanly before the run's time budget runs out, instead of
        # logging a timeout for every page left.
        if fetcher.client.deadline.remaining() < 15:
            result.truncated = True
            return
        if not budget.take():
            return
        try:
            final_url, markup = fetcher.html(url)
        except CrawlFailure as failure:
            if is_stop(failure):
                result.interrupted_by = failure
                return
            result.warnings.append(warning_from(failure, fetcher.engine, "job page"))
            continue
        add_postings(result, extract_postings(markup, final_url, rules))
        remember_profile_source(result, markup, final_url)


def add_postings(result: AdapterResult, postings: list[JobItem]) -> None:
    known = {item.external_id for item in result.items}
    for item in postings:
        if item.external_id not in known:
            known.add(item.external_id)
            result.items.append(item)


def remember_profile_source(result: AdapterResult, markup: str, url: str) -> None:
    """Use the first page that shows a hiring organisation for the profile."""
    if result.company is not None and result.company.logo_url:
        return
    profile = extract_company_profile(markup, url, own_site=True)
    result.company = (result.company or CompanyProfile()).merge(profile)


def finish(fetcher, client, request: CrawlRequest, result: AdapterResult) -> AdapterResult:
    name = request.source.config.get("company_name")
    if isinstance(name, str) and name.strip():
        result.company = CompanyProfile(name=name.strip()).merge(result.company)
    website = request.source.config.get("company_website")
    if website and result.interrupted_by is None:
        fetch_profile_page(client, website, result, fetcher.engine)

    if not result.items and result.interrupted_by is not None:
        raise result.interrupted_by
    if not result.items:
        # Nothing usable: a JavaScript-only page, wrong selectors/pattern, or a
        # page budget too small to reach any job page. Failing here lets the
        # strategy try the browser engine and tells the admin to look.
        hint = " within the page budget" if result.truncated else ""
        raise ParseError(
            f"no job postings found{hint}: pages have no JobPosting data and the configured selectors matched nothing",
            url=request.source.base_url,
        )
    return result
