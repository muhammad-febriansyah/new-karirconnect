"""Lever Postings API (public).

GET https://api.lever.co/v0/postings/{company}?mode=json&skip=N&limit=100
(EU accounts use api.eu.lever.co.)
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from urllib.parse import urlsplit

from ..contract import CompanyProfile, CrawlRequest, JobItem, Salary
from ..errors import CrawlFailure, ParseError
from ..http import SafeClient
from ..sections import add_section, split_sections
from .base import AdapterResult, fetch_profile_page

API_HOSTS = {"api.lever.co": "https://jobs.lever.co", "api.eu.lever.co": "https://jobs.eu.lever.co"}
PAGE_SIZE = 100
_SLUG = re.compile(r"^[A-Za-z0-9_.-]{1,100}$")


def company_slug(request: CrawlRequest) -> tuple[str, str]:
    parts = urlsplit(request.source.base_url)
    host = (parts.hostname or "api.lever.co").lower()
    if host not in API_HOSTS:
        host = "api.lever.co"
    slug = request.source.config.get("company")
    if not slug:
        path = parts.path.strip("/").split("/")
        if len(path) >= 3 and path[0] == "v0" and path[1] == "postings":
            slug = path[2]
    if not isinstance(slug, str) or not _SLUG.match(slug):
        raise ParseError("lever source needs a valid config.company")
    return host, slug


def _iso_from_ms(value) -> str | None:
    if isinstance(value, (int, float)) and value > 0:
        return datetime.fromtimestamp(value / 1000, tz=timezone.utc).isoformat()
    return None


def _salary(raw) -> Salary | None:
    if not isinstance(raw, dict):
        return None
    low, high = raw.get("min"), raw.get("max")
    if not isinstance(low, (int, float)) and not isinstance(high, (int, float)):
        return None
    return Salary(
        min=int(low) if isinstance(low, (int, float)) else None,
        max=int(high) if isinstance(high, (int, float)) else None,
        currency=raw.get("currency") or None,
        interval=raw.get("interval") or None,
    )


class LeverAdapter:
    engine = "api"

    def fetch(self, client: SafeClient, request: CrawlRequest) -> AdapterResult:
        host, slug = company_slug(request)
        url = f"https://{host}/v0/postings/{slug}"
        result = AdapterResult()
        skip = 0

        while True:
            if result.pages >= request.limits.max_pages:
                result.truncated = True
                break
            try:
                page = client.get_json(url, params={"mode": "json", "skip": skip, "limit": PAGE_SIZE})
            except CrawlFailure as failure:
                if result.pages == 0:
                    raise
                result.interrupted_by = failure
                break
            result.pages += 1
            if not isinstance(page, list):
                raise ParseError("lever response is not a list", url=url)

            for posting in page:
                if len(result.items) >= request.limits.max_items:
                    result.truncated = True
                    break
                if (item := self._item(posting)) is not None:
                    result.items.append(item)
            if result.truncated or len(page) < PAGE_SIZE:
                break
            skip += PAGE_SIZE

        name = request.source.config.get("company_name")
        result.company = CompanyProfile(name=name if isinstance(name, str) and name else None)
        # The hosted board page shows the company's logo; the API does not.
        fetch_profile_page(client, f"{API_HOSTS[host]}/{slug}", result, self.engine, own_site=False)
        fetch_profile_page(client, request.source.config.get("company_website"), result, self.engine)
        return result

    def _item(self, posting) -> JobItem | None:
        if not isinstance(posting, dict) or not posting.get("id"):
            return None
        categories = posting.get("categories") if isinstance(posting.get("categories"), dict) else {}
        sections = split_sections(posting.get("description") or "")
        for block in posting.get("lists") or []:
            if isinstance(block, dict) and block.get("content"):
                add_section(sections, str(block.get("text") or ""), f"<ul>{block['content']}</ul>")
        additional = split_sections(posting.get("additional") or "")
        for key, value in additional.items():
            if value:
                sections[key] = f"{sections[key]}\n{value}" if sections.get(key) else value

        locations = categories.get("allLocations")
        location = categories.get("location") or (", ".join(locations) if isinstance(locations, list) else None)
        workplace = posting.get("workplaceType")
        hosted = posting.get("hostedUrl") or ""
        return JobItem(
            external_id=str(posting["id"]),
            title=str(posting.get("text") or "").strip(),
            apply_url=posting.get("applyUrl") or hosted,
            source_url=hosted,
            location_text=location or None,
            employment_type_raw=categories.get("commitment") or None,
            workplace_type_raw=workplace if workplace and workplace != "unspecified" else None,
            department_raw=" / ".join(v for v in (categories.get("department"), categories.get("team")) if v) or None,
            country_raw=posting.get("country") or None,
            salary=_salary(posting.get("salaryRange")),
            published_at=_iso_from_ms(posting.get("createdAt")),
            **sections,
        )
