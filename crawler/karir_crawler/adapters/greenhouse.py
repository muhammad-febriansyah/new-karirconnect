"""Greenhouse Job Board API (public, documented for job boards).

GET https://boards-api.greenhouse.io/v1/boards/{token}           -> board name + intro
GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
"""

from __future__ import annotations

import re
from urllib.parse import urlsplit

from ..contract import CompanyProfile, CrawlRequest, JobItem
from ..errors import CrawlFailure, ParseError
from ..http import SafeClient
from ..sections import split_sections, unescape_if_needed
from .base import AdapterResult, fetch_profile_page, warning_from

API_ROOT = "https://boards-api.greenhouse.io/v1/boards"
HOSTED_BOARD = "https://job-boards.greenhouse.io"
_TOKEN = re.compile(r"^[A-Za-z0-9_-]{1,100}$")
_EMPLOYMENT_KEYS = re.compile(r"employment|job type|commitment|contract type|jenis pekerjaan", re.I)
_WORKPLACE_KEYS = re.compile(r"workplace|location type|remote|work arrangement|work model", re.I)


def board_token(request: CrawlRequest) -> str:
    token = request.source.config.get("board_token")
    if not token:
        path = urlsplit(request.source.base_url).path.strip("/").split("/")
        if len(path) >= 3 and path[0] == "v1" and path[1] == "boards":
            token = path[2]
    if not isinstance(token, str) or not _TOKEN.match(token):
        raise ParseError("greenhouse source needs a valid config.board_token")
    return token


def _metadata_value(metadata: list | None, pattern: re.Pattern) -> str | None:
    for entry in metadata or []:
        if isinstance(entry, dict) and pattern.search(str(entry.get("name") or "")):
            value = entry.get("value")
            if isinstance(value, list):
                value = ", ".join(str(v) for v in value if v)
            if value not in (None, "", "n/a"):
                return str(value)
    return None


def _names(entries: list | None) -> str | None:
    names = [str(e["name"]).strip() for e in entries or [] if isinstance(e, dict) and e.get("name")]
    return ", ".join(names) or None


class GreenhouseAdapter:
    engine = "api"

    def fetch(self, client: SafeClient, request: CrawlRequest) -> AdapterResult:
        token = board_token(request)
        result = AdapterResult()

        data = client.get_json(f"{API_ROOT}/{token}/jobs", params={"content": "true"})
        result.pages = 1
        if not isinstance(data, dict) or not isinstance(data.get("jobs"), list):
            raise ParseError("greenhouse response has no jobs list", url=f"{API_ROOT}/{token}/jobs")

        jobs = data["jobs"]
        if len(jobs) > request.limits.max_items:
            result.truncated = True
            jobs = jobs[: request.limits.max_items]
        result.items = [item for job in jobs if (item := self._item(job)) is not None]

        self._company(client, request, token, result)
        return result

    def _item(self, job: dict) -> JobItem | None:
        if not isinstance(job, dict) or job.get("id") is None:
            return None
        sections = split_sections(unescape_if_needed(job.get("content") or ""))
        url = job.get("absolute_url") or ""
        location = job.get("location") if isinstance(job.get("location"), dict) else {}
        return JobItem(
            external_id=str(job["id"]),
            title=str(job.get("title") or "").strip(),
            apply_url=url,
            source_url=url,
            company_name=job.get("company_name") or None,
            location_text=(location.get("name") or "").strip() or _names(job.get("offices")),
            employment_type_raw=_metadata_value(job.get("metadata"), _EMPLOYMENT_KEYS),
            workplace_type_raw=_metadata_value(job.get("metadata"), _WORKPLACE_KEYS),
            department_raw=_names(job.get("departments")),
            published_at=job.get("first_published") or None,
            updated_at=job.get("updated_at") or None,
            application_deadline=job.get("application_deadline") or None,
            **sections,
        )

    def _company(self, client: SafeClient, request: CrawlRequest, token: str, result: AdapterResult) -> None:
        profile = CompanyProfile()
        try:
            board = client.get_json(f"{API_ROOT}/{token}")
        except CrawlFailure as failure:
            result.warnings.append(warning_from(failure, self.engine, "greenhouse board info"))
            board = None
        if isinstance(board, dict):
            intro = unescape_if_needed(board.get("content") or "").strip()
            profile = CompanyProfile(name=board.get("name") or None, about=intro or None)
        if profile.name is None and result.items:
            profile.name = result.items[0].company_name
        result.company = profile

        # The hosted board page shows the company's logo; the API does not.
        fetch_profile_page(client, f"{HOSTED_BOARD}/{token}", result, self.engine, own_site=False)
        fetch_profile_page(client, request.source.config.get("company_website"), result, self.engine)
