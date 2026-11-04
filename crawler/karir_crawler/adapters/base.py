from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from ..contract import CompanyProfile, CrawlRequest, ErrorRecord, JobItem
from ..errors import CrawlFailure
from ..http import SafeClient


@dataclass
class AdapterResult:
    items: list[JobItem] = field(default_factory=list)
    company: CompanyProfile | None = None
    pages: int = 0
    # More listings existed than max_items/max_pages allowed us to read.
    truncated: bool = False
    # A later page failed after earlier pages succeeded; items are kept.
    interrupted_by: CrawlFailure | None = None
    # Non-fatal problems (e.g. the company profile page could not be read).
    warnings: list[ErrorRecord] = field(default_factory=list)


class Adapter(Protocol):
    def fetch(self, client: SafeClient, request: CrawlRequest) -> AdapterResult: ...


def warning_from(failure: CrawlFailure, engine: str, what: str) -> ErrorRecord:
    return ErrorRecord(
        engine=engine,
        category=failure.category,
        message=f"{what}: {failure.message}",
        retryable=failure.retryable,
        http_status=failure.http_status,
        url=failure.url,
        context={"non_fatal": True},
    )


def fetch_profile_page(
    client: SafeClient, url: str | None, result: AdapterResult, engine: str, *, own_site: bool = True
) -> None:
    """Best-effort profile/logo lookup on a public page; never fails the run."""
    from ..company import extract_company_profile
    from ..safety import host_allowed
    from urllib.parse import urlsplit

    if not url:
        return
    host = urlsplit(url).hostname or ""
    if not host_allowed(host, client.guard.allowed_domains):
        return
    try:
        markup = client.get_text(url)
    except CrawlFailure as failure:
        result.warnings.append(warning_from(failure, engine, "company profile"))
        return
    profile = extract_company_profile(markup, url, own_site=own_site)
    result.company = (result.company or CompanyProfile()).merge(profile)
