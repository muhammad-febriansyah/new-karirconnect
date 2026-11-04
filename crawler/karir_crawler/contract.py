"""The JSON contract shared with Laravel (App\\Services\\Crawler\\CrawlerClient).

Bump CONTRACT_VERSION on any breaking change to the request or response.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

CONTRACT_VERSION = 1

SOURCE_TYPES = {"greenhouse", "lever", "sitemap", "generic_html", "job_feed", "platform"}
ENGINES = ("api", "http", "browser")
DEFAULT_USER_AGENT = "KarirConnectBot/0.1"


class InvalidRequest(ValueError):
    pass


@dataclass(frozen=True)
class Limits:
    max_pages: int = 20
    max_items: int = 2000
    timeout_s: int = 120
    rate_per_minute: int = 30
    browser_allowed: bool = False


@dataclass(frozen=True)
class SourceSpec:
    type: str
    base_url: str
    allowed_domains: tuple[str, ...]
    config: dict[str, Any]


@dataclass(frozen=True)
class CrawlRequest:
    run_uuid: str
    source: SourceSpec
    limits: Limits
    engines: tuple[str, ...]
    expected_min_items: int = 0
    user_agent: str = DEFAULT_USER_AGENT
    respect_robots: bool = True
    # Pages read in recent runs; HTML adapters visit unread pages first.
    recently_seen: frozenset[str] = frozenset()

    @classmethod
    def from_dict(cls, data: Any) -> "CrawlRequest":
        if not isinstance(data, dict):
            raise InvalidRequest("request must be a JSON object")
        if data.get("contract_version") != CONTRACT_VERSION:
            raise InvalidRequest(f"unsupported contract_version {data.get('contract_version')!r}")

        source = data.get("source")
        if not isinstance(source, dict):
            raise InvalidRequest("source is required")
        source_type = source.get("type")
        if source_type not in SOURCE_TYPES:
            raise InvalidRequest(f"unknown source type {source_type!r}")
        base_url = source.get("base_url")
        if not isinstance(base_url, str) or not base_url:
            raise InvalidRequest("source.base_url is required")
        domains = source.get("allowed_domains")
        if not isinstance(domains, list) or not domains or not all(isinstance(d, str) and d for d in domains):
            raise InvalidRequest("source.allowed_domains must be a non-empty list of hosts")
        config = source.get("config") or {}
        if not isinstance(config, dict):
            raise InvalidRequest("source.config must be an object")

        raw_limits = data.get("limits") or {}
        if not isinstance(raw_limits, dict):
            raise InvalidRequest("limits must be an object")
        defaults = Limits()
        limits = Limits(
            max_pages=_bounded_int(raw_limits, "max_pages", defaults.max_pages, 1, 500),
            max_items=_bounded_int(raw_limits, "max_items", defaults.max_items, 1, 20000),
            timeout_s=_bounded_int(raw_limits, "timeout_s", defaults.timeout_s, 5, 1800),
            rate_per_minute=_bounded_int(raw_limits, "rate_per_minute", defaults.rate_per_minute, 1, 600),
            browser_allowed=bool(raw_limits.get("browser_allowed", False)),
        )

        engines = data.get("engines") or ["api"]
        if not isinstance(engines, list) or not all(e in ENGINES for e in engines):
            raise InvalidRequest(f"engines must be a subset of {ENGINES}")

        run_uuid = data.get("run_uuid")
        if not isinstance(run_uuid, str) or not run_uuid:
            raise InvalidRequest("run_uuid is required")

        user_agent = data.get("user_agent") or DEFAULT_USER_AGENT
        if not isinstance(user_agent, str) or len(user_agent) > 200 or "\n" in user_agent:
            raise InvalidRequest("user_agent must be a short single-line string")

        return cls(
            run_uuid=run_uuid,
            source=SourceSpec(
                type=source_type,
                base_url=base_url,
                allowed_domains=tuple(d.lower().strip() for d in domains),
                config=config,
            ),
            limits=limits,
            # Keep the given order but never run an engine twice.
            engines=tuple(dict.fromkeys(engines)),
            expected_min_items=_bounded_int(data, "expected_min_items", 0, 0, 100000),
            user_agent=user_agent,
            # robots.txt is honoured unless the source config explicitly records
            # written permission that overrides it.
            respect_robots=not bool(config.get("robots_override_permission")),
            recently_seen=frozenset(
                str(url) for url in (data.get("recently_seen") or [])[:20000] if isinstance(url, str)
            ),
        )


def _bounded_int(data: dict, key: str, default: int, low: int, high: int) -> int:
    value = data.get(key, default)
    if isinstance(value, bool) or not isinstance(value, int):
        raise InvalidRequest(f"{key} must be an integer")
    return max(low, min(high, value))


@dataclass
class CompanyProfile:
    """Mirrors the profile columns of `companies`. Unknown fields stay None."""

    name: str | None = None
    domain: str | None = None
    tagline: str | None = None
    about: str | None = None
    website: str | None = None
    logo_url: str | None = None
    cover_url: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    founded_year: int | None = None
    industry_raw: str | None = None
    size_raw: str | None = None
    profile_source_url: str | None = None

    def merge(self, other: "CompanyProfile | None") -> "CompanyProfile":
        """Fill our empty fields from `other`; never overwrite what we have."""
        if other is None:
            return self
        for key, value in asdict(other).items():
            if getattr(self, key) in (None, "") and value not in (None, ""):
                setattr(self, key, value)
        return self


@dataclass
class Salary:
    min: int | None = None
    max: int | None = None
    currency: str | None = None
    interval: str | None = None


@dataclass
class JobItem:
    """One listing. Content fields line up with `job_posts`; raw values are
    passed through untouched and mapped to enums/master data in Laravel."""

    external_id: str
    title: str
    apply_url: str
    source_url: str
    company_name: str | None = None
    # Job boards and feeds list many employers; each item then carries its
    # own employer profile.
    company_logo_url: str | None = None
    company_website: str | None = None
    company_about: str | None = None
    company_size_raw: str | None = None
    company_industry_raw: str | None = None
    # An application email the posting itself publishes, if any.
    contact_email: str | None = None
    description: str | None = None
    responsibilities: str | None = None
    requirements: str | None = None
    benefits: str | None = None
    location_text: str | None = None
    employment_type_raw: str | None = None
    workplace_type_raw: str | None = None
    department_raw: str | None = None
    country_raw: str | None = None
    salary: Salary | None = None
    skills_raw: list[str] = field(default_factory=list)
    published_at: str | None = None
    updated_at: str | None = None
    application_deadline: str | None = None


@dataclass
class ErrorRecord:
    engine: str | None
    category: str
    message: str
    retryable: bool = False
    http_status: int | None = None
    url: str | None = None
    retry_after_s: int | None = None
    context: dict[str, Any] | None = None


@dataclass
class EngineAttempt:
    engine: str
    outcome: str  # ok | failed | stopped | unavailable | skipped
    ms: int = 0
    items: int = 0


@dataclass
class CrawlResponse:
    run_uuid: str
    status: str
    engine_used: str | None = None
    engines_attempted: list[EngineAttempt] = field(default_factory=list)
    company: CompanyProfile | None = None
    items: list[JobItem] = field(default_factory=list)
    errors: list[ErrorRecord] = field(default_factory=list)
    stats: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["contract_version"] = CONTRACT_VERSION
        return data
