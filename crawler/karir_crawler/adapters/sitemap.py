"""Sitemap source: read sitemap.xml (or a sitemap index, optionally gzip),
keep the URLs matching `config.url_pattern`, newest first, then read each
job page's JobPosting data (or configured selectors).
"""

from __future__ import annotations

import gzip
import io
import xml.etree.ElementTree as ElementTree

from ..contract import CrawlRequest
from ..errors import CrawlFailure, ParseError
from ..http import SafeClient
from .base import AdapterResult, warning_from
from .html_common import Budget, crawl_detail_pages, finish, is_stop, same_source, url_pattern
from ..engines.pages import HttpFetcher

MAX_XML_BYTES = 20 * 1024 * 1024
MAX_SITEMAP_DEPTH = 2


def decode_sitemap(body: bytes, url: str) -> bytes:
    if body[:2] == b"\x1f\x8b":
        with gzip.GzipFile(fileobj=io.BytesIO(body)) as archive:
            body = archive.read(MAX_XML_BYTES + 1)
        if len(body) > MAX_XML_BYTES:
            raise ParseError("sitemap is too large after decompression", url=url)
    head = body[:2048].lower()
    # Sitemaps never need a DTD; refusing one rules out entity expansion tricks.
    if b"<!doctype" in head or b"<!entity" in body[:65536].lower():
        raise ParseError("sitemap contains a DTD or entity declarations", url=url)
    return body


def parse_sitemap(body: bytes, url: str) -> tuple[str, list[tuple[str, str]]]:
    """('index' | 'urlset', [(loc, lastmod)])."""
    try:
        root = ElementTree.fromstring(body)
    except ElementTree.ParseError as exc:
        raise ParseError(f"sitemap is not valid XML: {exc}", url=url) from exc

    kind = "index" if root.tag.endswith("sitemapindex") else "urlset" if root.tag.endswith("urlset") else ""
    if not kind:
        raise ParseError("not a sitemap (expected <urlset> or <sitemapindex>)", url=url)

    entries: list[tuple[str, str]] = []
    for node in root:
        loc = next((child.text for child in node if child.tag.endswith("loc")), None)
        lastmod = next((child.text for child in node if child.tag.endswith("lastmod")), None)
        if loc and loc.strip():
            entries.append((loc.strip(), (lastmod or "").strip()))
    return kind, entries


class SitemapAdapter:
    engine = "http"

    def fetch(self, client: SafeClient, request: CrawlRequest) -> AdapterResult:
        result = AdapterResult()
        budget = Budget(request, result)
        pattern = url_pattern(request)
        fetcher = HttpFetcher(client)

        job_urls: list[tuple[str, str]] = []
        queue: list[tuple[str, int]] = [(request.source.base_url, 0)]
        while queue:
            sitemap_url, depth = queue.pop(0)
            if not budget.take():
                break
            try:
                body = decode_sitemap(client.get(sitemap_url).content, sitemap_url)
                kind, entries = parse_sitemap(body, sitemap_url)
            except CrawlFailure as failure:
                if sitemap_url == request.source.base_url or is_stop(failure):
                    raise
                result.warnings.append(warning_from(failure, self.engine, "child sitemap"))
                continue

            for loc, lastmod in entries:
                if not same_source(loc, request):
                    continue
                if kind == "index":
                    if depth + 1 <= MAX_SITEMAP_DEPTH:
                        queue.append((loc, depth + 1))
                elif pattern is None or pattern.search(loc):
                    job_urls.append((loc, lastmod))

        # Newest first, so a budget cut drops the oldest pages.
        job_urls.sort(key=lambda entry: entry[1], reverse=True)
        crawl_detail_pages(fetcher, [loc for loc, _ in job_urls], request, result, budget, seen=set())
        return finish(fetcher, client, request, result)
