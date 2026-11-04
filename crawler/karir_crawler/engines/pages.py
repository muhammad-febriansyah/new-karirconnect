"""Fetch a page as HTML, either over plain HTTP or with a headless browser.

Both fetchers expose `html(url) -> (final_url, markup)` so the HTML adapters
do not care which engine they run on.
"""

from __future__ import annotations

from typing import Protocol

from ..errors import ParseError
from ..http import SafeClient


class PageFetcher(Protocol):
    engine: str

    def html(self, url: str) -> tuple[str, str]: ...

    def close(self) -> None: ...


class HttpFetcher:
    engine = "http"

    def __init__(self, client: SafeClient) -> None:
        self.client = client

    def html(self, url: str) -> tuple[str, str]:
        response = self.client.get(url)
        content_type = response.headers.get("content-type", "").lower()
        if content_type and "html" not in content_type and "xml" not in content_type:
            raise ParseError(f"expected an HTML page, got {content_type}", url=url)
        return str(response.url), response.text

    def close(self) -> None:
        return None
