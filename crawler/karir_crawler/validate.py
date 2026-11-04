"""Technical checks on extracted items. Business checks (master data,
allowlists for publishing) happen again in Laravel."""

from __future__ import annotations

from datetime import datetime
from urllib.parse import urlsplit

from .contract import ErrorRecord, JobItem

MAX_EXTERNAL_ID = 191
MAX_TITLE = 180


def _valid_url(value: str | None) -> bool:
    if not value:
        return False
    parts = urlsplit(value)
    return parts.scheme in {"http", "https"} and bool(parts.hostname)


def _valid_date(value: str | None) -> bool:
    if value is None:
        return True
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def problems(item: JobItem) -> list[str]:
    found: list[str] = []
    if not item.external_id.strip() or len(item.external_id) > MAX_EXTERNAL_ID:
        found.append("external_id is empty or too long")
    if not item.title:
        found.append("title is empty")
    elif len(item.title) > MAX_TITLE:
        found.append(f"title is longer than {MAX_TITLE} characters")
    if not _valid_url(item.apply_url):
        found.append("apply_url is not an absolute http(s) URL")
    for name in ("published_at", "updated_at", "application_deadline"):
        if not _valid_date(getattr(item, name)):
            found.append(f"{name} is not an ISO date")
    if item.salary is not None:
        low, high = item.salary.min, item.salary.max
        if (low is not None and low < 0) or (high is not None and high < 0):
            found.append("salary is negative")
        if low is not None and high is not None and low > high:
            found.append("salary min is greater than max")
    return found


def filter_valid(items: list[JobItem], engine: str) -> tuple[list[JobItem], list[ErrorRecord]]:
    valid: list[JobItem] = []
    rejected: list[ErrorRecord] = []
    seen: set[str] = set()
    for item in items:
        issues = problems(item)
        if item.external_id in seen:
            issues.append("duplicate external_id in this run")
        if issues:
            rejected.append(
                ErrorRecord(
                    engine=engine,
                    category="validation_error",
                    message="; ".join(issues),
                    url=item.source_url or None,
                    context={"external_id": item.external_id, "title": item.title[:120]},
                )
            )
            continue
        seen.add(item.external_id)
        valid.append(item)
    return valid, rejected
