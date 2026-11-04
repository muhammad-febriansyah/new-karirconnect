"""Public job feeds that publish an API for re-sharing their listings.

Each feed has its own terms (attribution, link back, apply on the original
page); Laravel enforces those when a listing is shown. Here we only map the
feed's fields onto JobItem.

  remoteok   https://remoteok.com/api
  jobicy     https://jobicy.com/api/v2/remote-jobs
  himalayas  https://himalayas.app/jobs/api
  remotive   https://remotive.com/api/remote-jobs
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any

from ..contract import CompanyProfile, CrawlRequest, JobItem, Salary
from ..errors import CrawlFailure, ParseError
from ..extract import _number
from ..http import SafeClient
from ..sections import split_sections
from .base import AdapterResult


def _text(value: Any) -> str | None:
    if isinstance(value, list):
        value = ", ".join(str(v).strip() for v in value if v and str(v).strip())
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def _epoch_iso(value: Any) -> str | None:
    number = _number(value)
    if not number or number <= 0:
        return None
    return datetime.fromtimestamp(number, tz=timezone.utc).isoformat()


def _salary(low: Any, high: Any, currency: Any, interval: Any) -> Salary | None:
    low_n, high_n = _number(low) or None, _number(high) or None
    if low_n is None and high_n is None:
        return None
    return Salary(min=low_n, max=high_n, currency=_text(currency), interval=_text(interval))


def _item(external_id: Any, title: Any, url: Any, apply_url: Any, company: Any, logo: Any, description: Any, **extra) -> JobItem | None:
    if external_id in (None, "") or not _text(title) or not _text(url):
        return None
    sections = split_sections(_text(description))
    return JobItem(
        external_id=str(external_id),
        title=_text(title) or "",
        apply_url=_text(apply_url) or _text(url) or "",
        source_url=_text(url) or "",
        company_name=_text(company),
        company_logo_url=_text(logo),
        workplace_type_raw="remote",
        **sections,
        **extra,
    )


def remoteok(posting: dict) -> JobItem | None:
    if "legal" in posting:  # the first element is the terms notice
        return None
    return _item(
        posting.get("id"), posting.get("position"), posting.get("url"), posting.get("apply_url"),
        posting.get("company"), posting.get("company_logo") or posting.get("logo"), posting.get("description"),
        location_text=_text(posting.get("location")) or "Remote",
        salary=_salary(posting.get("salary_min"), posting.get("salary_max"), "USD", "year"),
        skills_raw=[str(tag) for tag in posting.get("tags") or []][:30],
        published_at=_text(posting.get("date")),
    )


def jobicy(posting: dict) -> JobItem | None:
    return _item(
        posting.get("id"), posting.get("jobTitle"), posting.get("url"), posting.get("url"),
        posting.get("companyName"), posting.get("companyLogo"), posting.get("jobDescription"),
        location_text=_text(posting.get("jobGeo")) or "Remote",
        employment_type_raw=_text(posting.get("jobType")),
        department_raw=_text(posting.get("jobIndustry")),
        salary=_salary(posting.get("annualSalaryMin"), posting.get("annualSalaryMax"), posting.get("salaryCurrency"), "year"),
        published_at=_text(posting.get("pubDate")),
    )


def himalayas(posting: dict) -> JobItem | None:
    return _item(
        posting.get("guid"), posting.get("title"), posting.get("guid"), posting.get("applicationLink"),
        posting.get("companyName"), posting.get("companyLogo"), posting.get("description"),
        location_text=_text(posting.get("locationRestrictions")) or "Remote",
        employment_type_raw=_text(posting.get("employmentType")),
        department_raw=_text(posting.get("categories")),
        salary=_salary(posting.get("minSalary"), posting.get("maxSalary"), posting.get("currency"), posting.get("salaryPeriod")),
        published_at=_epoch_iso(posting.get("pubDate")),
        application_deadline=_epoch_iso(posting.get("expiryDate")),
    )


def remotive(posting: dict) -> JobItem | None:
    return _item(
        posting.get("id"), posting.get("title"), posting.get("url"), posting.get("url"),
        posting.get("company_name"), posting.get("company_logo"), posting.get("description"),
        location_text=_text(posting.get("candidate_required_location")) or "Remote",
        employment_type_raw=_text(posting.get("job_type")),
        department_raw=_text(posting.get("category")),
        skills_raw=[str(tag) for tag in posting.get("tags") or []][:30],
        published_at=_text(posting.get("publication_date")),
    )


# feed -> (url, params, path to the list in the response, mapper, cursor key)
FEEDS: dict[str, tuple[str, dict, str | None, Callable[[dict], JobItem | None], str | None]] = {
    "remoteok": ("https://remoteok.com/api", {}, None, remoteok, None),
    "jobicy": ("https://jobicy.com/api/v2/remote-jobs", {"count": 50}, "jobs", jobicy, "nextCursor"),
    "himalayas": ("https://himalayas.app/jobs/api", {"limit": 20}, "jobs", himalayas, "nextCursor"),
    "remotive": ("https://remotive.com/api/remote-jobs", {"limit": 100}, "jobs", remotive, None),
}

# Filters a feed's API understands, passed straight through from config.
ALLOWED_PARAMS = {
    "jobicy": {"geo", "industry", "tag"},
    "remotive": {"category", "search"},
    "himalayas": set(),
    "remoteok": set(),
}


class FeedAdapter:
    engine = "api"

    def fetch(self, client: SafeClient, request: CrawlRequest) -> AdapterResult:
        name = request.source.config.get("feed")
        if name not in FEEDS:
            raise ParseError(f"unknown job feed {name!r}")
        url, params, list_key, mapper, cursor_key = FEEDS[name]
        params = {**params, **{k: v for k, v in (request.source.config.get("params") or {}).items() if k in ALLOWED_PARAMS[name]}}

        result = AdapterResult(company=CompanyProfile())
        cursor = None
        while True:
            if result.pages >= request.limits.max_pages:
                result.truncated = True
                break
            page_params = {**params, **({"cursor": cursor} if cursor else {})}
            try:
                data = client.get_json(url, params=page_params)
            except CrawlFailure as failure:
                if result.pages == 0:
                    raise
                result.interrupted_by = failure
                break
            result.pages += 1

            postings = data.get(list_key) if list_key else data
            if not isinstance(postings, list):
                raise ParseError(f"{name} response has no job list", url=url)
            for posting in postings:
                if len(result.items) >= request.limits.max_items:
                    result.truncated = True
                    break
                if isinstance(posting, dict) and (item := mapper(posting)) is not None:
                    result.items.append(item)

            cursor = data.get(cursor_key) if cursor_key and isinstance(data, dict) else None
            if result.truncated or not cursor or not postings:
                break
        return result
