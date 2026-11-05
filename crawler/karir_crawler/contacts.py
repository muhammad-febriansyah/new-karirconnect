"""Find a company's published recruitment email on its own website.

Reads a handful of pages on the company's domain (home, then contact and
careers pages it links to or that commonly exist), with the same SSRF guard,
robots.txt and throttling as a crawl. Only addresses on the company's own
domain count, and only a recruitment-looking one (hr@, recruitment@,
careers@, ...) is offered for forwarding applications.

Request (stdin)::

    {"contract_version": 1, "mode": "company_contact", "run_uuid": "...",
     "website": "https://contoh.co.id", "user_agent": "...", "respect_robots": true,
     "timeout_s": 60}

Response::

    {"contract_version": 1, "run_uuid": "...", "status": "succeeded" | "failed" | "access_restricted",
     "website": "https://contoh.co.id/", "recruitment_email": "hr@contoh.co.id" | null,
     "recruitment_email_url": "https://contoh.co.id/karir" | null, "general_email": "info@..." | null,
     "pages": 3, "errors": [...]}
"""

from __future__ import annotations

import html as html_lib
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import unquote, urljoin, urlsplit

import httpx
from bs4 import BeautifulSoup

from .contract import CONTRACT_VERSION, DEFAULT_USER_AGENT, InvalidRequest
from .errors import AccessRestricted, CrawlFailure
from .http import Clock, Deadline, SafeClient
from .safety import UrlGuard, system_resolver

MAX_PAGES = 8
RATE_PER_MINUTE = 30

# Common paths, tried after the links the home page offers.
COMMON_PATHS = ("/contact", "/contact-us", "/kontak", "/hubungi-kami", "/careers", "/career", "/karir", "/karier")

LINK_HINT = re.compile(r"contact|kontak|hubungi|career|karir|karier|join|recruit|rekrut|lowongan|vacanc|jobs?\b|hiring", re.I)

EMAIL = re.compile(r"(?<![\w.+-])([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})(?![\w-])")

NOT_A_MAILBOX = re.compile(r"\.(png|jpe?g|gif|svg|webp|css|js)$|noreply|no-reply|donotreply|example\.|sentry|wixpress", re.I)

# Second-level labels that sit under a country code (contoh.co.id, x.com.sg).
SECOND_LEVEL = {"co", "ac", "or", "go", "web", "my", "sch", "net", "com", "org", "biz", "gov", "edu", "mil", "ponpes", "desa"}

RECRUITMENT_TOKENS = {
    "hr", "hrd", "hrga", "hrm", "hcm", "hc", "job", "jobs", "people", "lamaran", "personalia", "loker",
    "vacancy", "career", "careers", "karir", "karier", "hiring", "talent", "recruitment", "recruiter",
    "recruit", "rekrutmen", "rekrut", "reqruitment", "humancapital",
}
RECRUITMENT_PREFIXES = ("recruit", "reqruit", "rekrut", "career", "karir", "karier", "hiring", "talent", "humancapital")


def registrable_domain(host: str) -> str:
    """contoh.co.id for careers.contoh.co.id; contoh.com for www.contoh.com."""
    labels = host.lower().rstrip(".").split(".")
    if len(labels) >= 3 and len(labels[-1]) == 2 and labels[-2] in SECOND_LEVEL:
        return ".".join(labels[-3:])
    return ".".join(labels[-2:])


def is_recruitment_mailbox(email: str) -> bool:
    local = email.split("@", 1)[0].lower()
    tokens = [token for token in re.split(r"[._\-+\d]+", local) if token]
    return any(token in RECRUITMENT_TOKENS or token.startswith(RECRUITMENT_PREFIXES) for token in tokens)


def emails_in(html: str, domain: str) -> list[str]:
    """Addresses on `domain` (or its subdomains), in page order."""
    text = unquote(html_lib.unescape(html)).replace("\\u003e", " ").replace("\\u003c", " ").replace("\\u0040", "@")
    found: list[str] = []
    for match in EMAIL.finditer(text):
        email = match.group(1).strip(".").lower()
        email_domain = email.rsplit("@", 1)[1]
        if NOT_A_MAILBOX.search(email):
            continue
        if email_domain != domain and not email_domain.endswith("." + domain):
            continue
        if email not in found:
            found.append(email)
    return found


def candidate_links(html: str, base_url: str, domain: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    links: list[str] = []
    for anchor in soup.find_all("a", href=True):
        href = str(anchor["href"]).strip()
        if href.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue
        url = urljoin(base_url, href).split("#", 1)[0]
        host = (urlsplit(url).hostname or "").lower()
        if urlsplit(url).scheme != "https" or registrable_domain(host) != domain:
            continue
        if LINK_HINT.search(url) or LINK_HINT.search(anchor.get_text(" ", strip=True)):
            if url not in links:
                links.append(url)
    return links


@dataclass
class ContactRequest:
    run_uuid: str
    website: str
    user_agent: str = DEFAULT_USER_AGENT
    respect_robots: bool = True
    timeout_s: int = 60

    @classmethod
    def from_dict(cls, data: Any) -> "ContactRequest":
        if not isinstance(data, dict) or data.get("contract_version") != CONTRACT_VERSION:
            raise InvalidRequest("unsupported contract_version")
        website = data.get("website")
        if not isinstance(website, str) or not website.startswith(("https://", "http://")):
            raise InvalidRequest("website must be an http(s) URL")
        timeout = data.get("timeout_s", 60)
        return cls(
            run_uuid=str(data.get("run_uuid") or ""),
            # The guard only allows https; plain-http sites are tried over https.
            website="https://" + website.split("://", 1)[1],
            user_agent=str(data.get("user_agent") or DEFAULT_USER_AGENT),
            respect_robots=bool(data.get("respect_robots", True)),
            timeout_s=max(10, min(int(timeout) if isinstance(timeout, int) else 60, 120)),
        )


@dataclass
class ContactResult:
    run_uuid: str
    status: str = "succeeded"
    website: str | None = None
    recruitment_email: str | None = None
    recruitment_email_url: str | None = None
    general_email: str | None = None
    pages: int = 0
    errors: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {"contract_version": CONTRACT_VERSION, **self.__dict__}


def find_contact(
    request: ContactRequest,
    *,
    resolver: Callable[[str], list[str]] = system_resolver,
    transport: httpx.BaseTransport | None = None,
    clock: Clock | None = None,
) -> ContactResult:
    result = ContactResult(run_uuid=request.run_uuid)
    host = (urlsplit(request.website).hostname or "").lower()
    if not host:
        result.status = "failed"
        result.errors.append({"category": "validation_error", "message": "website has no host"})
        return result

    domain = registrable_domain(host)
    deadline = Deadline(clock or Clock(), request.timeout_s)
    queue = [request.website.rstrip("/") + "/"]
    seen: set[str] = set()

    with SafeClient(
        UrlGuard([domain], resolver=resolver),
        user_agent=request.user_agent,
        rate_per_minute=RATE_PER_MINUTE,
        deadline=deadline,
        respect_robots=request.respect_robots,
        transport=transport,
    ) as client:
        while queue and result.pages < MAX_PAGES:
            url = queue.pop(0)
            if url in seen:
                continue
            seen.add(url)
            try:
                response = client.get(url)
            except AccessRestricted as failure:
                if result.pages == 0:
                    result.status = "access_restricted"
                    result.errors.append({"category": failure.category, "message": str(failure), "url": url})
                    return result
                continue
            except CrawlFailure as failure:
                result.errors.append({"category": failure.category, "message": str(failure), "url": url})
                if result.pages == 0 and len(seen) == 1:
                    # Home page unreachable: still try the common paths below.
                    queue.extend(request.website.rstrip("/") + path for path in COMMON_PATHS)
                continue

            result.pages += 1
            page = response.text
            if result.pages == 1:
                result.website = str(response.url)
                queue = candidate_links(page, str(response.url), domain) + [
                    f"https://{urlsplit(str(response.url)).hostname}{path}" for path in COMMON_PATHS
                ] + queue

            for email in emails_in(page, domain):
                if is_recruitment_mailbox(email):
                    if result.recruitment_email is None:
                        result.recruitment_email = email
                        found_on = urlsplit(str(response.url))
                        result.recruitment_email_url = f"{found_on.scheme}://{found_on.netloc}{found_on.path}"
                elif result.general_email is None:
                    result.general_email = email

            if result.recruitment_email is not None:
                break

    if result.pages == 0:
        result.status = "failed"
    return result
