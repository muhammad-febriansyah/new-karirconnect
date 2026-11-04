"""Career page source: start at `base_url`, read JobPosting data on the
listing page itself, follow links to job pages (`config.job_link_selector`
or links matching `config.url_pattern`) and pages of results
(`config.next_page_selector` or <link rel="next">).

Runs on the "http" engine first; when nothing can be found there (a
JavaScript-only page) the strategy can fall back to the "browser" engine.
"""

from __future__ import annotations

from urllib.parse import urljoin

from bs4 import Tag
from soupsieve import SelectorSyntaxError

from ..contract import CrawlRequest
from ..engines.pages import HttpFetcher
from ..errors import CrawlFailure, ParseError
from ..extract import clean_url, extract_postings, parse_html
from ..http import SafeClient
from .base import AdapterResult
from .html_common import (
    Budget,
    add_postings,
    crawl_detail_pages,
    finish,
    remember_profile_source,
    same_source,
    url_pattern,
)

MAX_LISTING_PAGES = 20


def _select_all(soup, selector: str) -> list[Tag]:
    try:
        return [node for node in soup.select(selector) if isinstance(node, Tag)]
    except SelectorSyntaxError as exc:
        raise ParseError(f"invalid CSS selector {selector!r}: {exc}") from exc


def _href(node: Tag | None) -> str | None:
    if node is None:
        return None
    if node.name != "a":
        node = node.find("a") if node.find("a") else node
    href = node.get("href") if isinstance(node, Tag) else None
    return str(href).strip() if href else None


def _next_page(soup, page_url: str, selector: str | None) -> str | None:
    if selector:
        nodes = _select_all(soup, selector)
        href = _href(nodes[0]) if nodes else None
    else:
        node = soup.find(["link", "a"], rel=lambda value: value and "next" in value)
        href = str(node.get("href")).strip() if isinstance(node, Tag) and node.get("href") else None
    return urljoin(page_url, href) if href else None


class GenericHtmlAdapter:
    def __init__(self, engine: str = "http") -> None:
        self.engine = engine

    def _fetcher(self, client: SafeClient):
        if self.engine == "browser":
            from ..engines.browser import BrowserFetcher

            return BrowserFetcher(client).__enter__()
        return HttpFetcher(client)

    def fetch(self, client: SafeClient, request: CrawlRequest) -> AdapterResult:
        fetcher = self._fetcher(client)
        try:
            return self._crawl(fetcher, client, request)
        finally:
            fetcher.close()

    def _crawl(self, fetcher, client: SafeClient, request: CrawlRequest) -> AdapterResult:
        config = request.source.config
        result = AdapterResult()
        budget = Budget(request, result)
        pattern = url_pattern(request)
        link_selector = config.get("job_link_selector") or None
        next_selector = config.get("next_page_selector") or None

        listing_url: str | None = request.source.base_url
        listing_seen: set[str] = set()
        detail_urls: list[str] = []
        listings_read = 0

        while listing_url and listings_read < MAX_LISTING_PAGES:
            listing_url = clean_url(listing_url)
            if listing_url in listing_seen or not budget.take():
                break
            listing_seen.add(listing_url)
            try:
                final_url, markup = fetcher.html(listing_url)
            except CrawlFailure:
                if listings_read == 0:
                    raise
                break
            listings_read += 1

            soup = parse_html(markup)
            # Listing pages sometimes embed every posting as JSON-LD already.
            add_postings(result, extract_postings(markup, final_url, None))
            remember_profile_source(result, markup, final_url)

            anchors = _select_all(soup, link_selector) if link_selector else soup.find_all("a", href=True)
            for anchor in anchors:
                href = _href(anchor)
                if not href:
                    continue
                url = clean_url(urljoin(final_url, href))
                if not same_source(url, request) or url in listing_seen:
                    continue
                if link_selector or (pattern is not None and pattern.search(url)):
                    detail_urls.append(url)

            next_url = _next_page(soup, final_url, next_selector)
            listing_url = next_url if next_url and same_source(next_url, request) else None

        crawl_detail_pages(fetcher, list(dict.fromkeys(detail_urls)), request, result, budget, seen=set(listing_seen))
        return finish(fetcher, client, request, result)
