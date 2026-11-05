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


# The company's main mailbox first; team mailboxes that are not about
# hiring (sales, press, support) last.
GENERAL_PRIORITY = ("info", "contact", "kontak", "hello", "halo", "hi", "admin", "office", "kantor", "cs", "customer", "corporate", "corsec", "mail", "email")
GENERAL_LAST = ("sales", "marketing", "partner", "partnership", "press", "media", "pr", "support", "billing", "finance", "invoice", "order", "privacy", "legal", "abuse", "security", "webmaster", "career")


def best_general_mailbox(emails: list[str]) -> str | None:
    def rank(email: str) -> tuple[int, int]:
        local = email.split("@", 1)[0].lower()
        token = re.split(r"[._\-+\d]+", local)[0] if local else local
        if token in GENERAL_PRIORITY:
            return (0, GENERAL_PRIORITY.index(token))
        if token in GENERAL_LAST or any(local.startswith(word) for word in GENERAL_LAST):
            return (2, 0)
        return (1, 0)  # a person or an unknown team

    return min(emails, key=rank) if emails else None


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


LEGAL_WORDS = {
    "pt", "tbk", "cv", "persero", "perseroan", "terbatas", "indonesia", "indonesian", "group", "grup", "holding",
    "company", "co", "ltd", "inc", "corp", "corporation", "the", "and", "dan", "official", "id",
}

PARKED = re.compile(r"for sale|is for sale|buy this domain|domain (is )?(parked|for sale)|hugedomains|sedo|dan\.com|afternic|parkingcrew|domain dijual", re.I)


def core_name(name: str) -> str:
    """'PT. MR.DIY Indonesia Tbk' -> 'mrdiy'; letters and digits only."""
    words = re.findall(r"[a-z0-9]+", re.sub(r"[.'’]", "", name.lower()))
    return "".join(word for word in words if word not in LEGAL_WORDS)


GENERIC_WORDS = {"international", "internasional", "global", "nusantara", "teknologi", "technology", "digital", "services", "solutions"}

NAME_AS_DOMAIN = re.compile(r"\b([a-z0-9][a-z0-9-]*\.(?:co\.id|or\.id|ac\.id|com|id|net|org|io|co))\b", re.I)


def core_variants(name: str) -> list[str]:
    """The core name, then the same without generic words ("Akasha Wira
    International" -> akashawirainternational, akashawira)."""
    words = [w for w in re.findall(r"[a-z0-9]+", re.sub(r"[.'’]", "", name.lower())) if w not in LEGAL_WORDS]
    variants = ["".join(words), "".join(w for w in words if w not in GENERIC_WORDS)]
    # Short one-word names ("Zone", "Dandy") match unrelated sites.
    return [v for v in dict.fromkeys(variants) if len(v) >= 6]


def candidate_sites(name: str) -> list[str]:
    hosts: list[str] = []
    if match := NAME_AS_DOMAIN.search(name):
        hosts.append(match.group(1).lower())  # "Jakmall.com"
    for core in core_variants(name):
        hosts += [f"{core}.co.id", f"{core}.id", f"{core}.com"]
    if "indonesia" in name.lower() and core_variants(name):
        hosts.append(f"{core_variants(name)[0]}indonesia.com")
    return [f"https://{host}/" for host in dict.fromkeys(hosts)][:8]


def site_belongs_to(html: str, name: str) -> bool:
    """The page's title, site name or main heading names the company, and it
    is not a parked or for-sale domain."""
    soup = BeautifulSoup(html, "html.parser")
    labels = [soup.title.get_text(" ", strip=True) if soup.title else ""]
    for key in ("og:site_name", "og:title", "application-name"):
        tag = soup.find("meta", attrs={"property": key}) or soup.find("meta", attrs={"name": key})
        if tag and tag.get("content"):
            labels.append(str(tag["content"]))
    heading = soup.find("h1")
    if heading:
        labels.append(heading.get_text(" ", strip=True))
    text = " ".join(labels)
    if not text.strip() or PARKED.search(text) or PARKED.search(soup.get_text(" ", strip=True)[:3000]):
        return False
    page = core_name(text)
    return any(variant in page for variant in core_variants(name)) or bool(
        (match := NAME_AS_DOMAIN.search(name)) and core_name(match.group(1).split(".")[0]) in page
    )


@dataclass
class ContactRequest:
    run_uuid: str
    website: str | None
    user_agent: str = DEFAULT_USER_AGENT
    respect_robots: bool = True
    timeout_s: int = 60
    company_name: str | None = None

    @classmethod
    def from_dict(cls, data: Any) -> "ContactRequest":
        if not isinstance(data, dict) or data.get("contract_version") != CONTRACT_VERSION:
            raise InvalidRequest("unsupported contract_version")
        website = data.get("website")
        name = data.get("company_name")
        if website is not None and (not isinstance(website, str) or not website.startswith(("https://", "http://"))):
            raise InvalidRequest("website must be an http(s) URL")
        if website is None and not (isinstance(name, str) and name.strip()):
            raise InvalidRequest("website or company_name is required")
        timeout = data.get("timeout_s", 60)
        return cls(
            run_uuid=str(data.get("run_uuid") or ""),
            # The guard only allows https; plain-http sites are tried over https.
            website=("https://" + website.split("://", 1)[1]) if website else None,
            user_agent=str(data.get("user_agent") or DEFAULT_USER_AGENT),
            respect_robots=bool(data.get("respect_robots", True)),
            timeout_s=max(10, min(int(timeout) if isinstance(timeout, int) else 60, 120)),
            company_name=name.strip() if isinstance(name, str) and name.strip() else None,
        )


@dataclass
class ContactResult:
    run_uuid: str
    status: str = "succeeded"
    website: str | None = None
    recruitment_email: str | None = None
    recruitment_email_url: str | None = None
    general_email: str | None = None
    # True when the website was found from the company name, not given.
    website_guessed: bool = False
    pages: int = 0
    errors: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {"contract_version": CONTRACT_VERSION, **self.__dict__}


def guess_website(
    request: ContactRequest,
    *,
    resolver: Callable[[str], list[str]] = system_resolver,
    transport: httpx.BaseTransport | None = None,
    clock: Clock | None = None,
) -> str | None:
    """The first candidate domain whose home page names the company."""
    name = request.company_name or ""
    deadline = Deadline(clock or Clock(), min(request.timeout_s, 30))
    for url in candidate_sites(name):
        domain = registrable_domain(urlsplit(url).hostname or "")
        with SafeClient(
            UrlGuard([domain], resolver=resolver),
            user_agent=request.user_agent,
            rate_per_minute=RATE_PER_MINUTE,
            deadline=deadline,
            respect_robots=request.respect_robots,
            transport=transport,
        ) as client:
            try:
                response = client.get(url)
            except CrawlFailure:
                continue
        final_host = (urlsplit(str(response.url)).hostname or "").lower()
        if registrable_domain(final_host) == domain and site_belongs_to(response.text, name):
            return f"https://{final_host}/"
    return None


def find_contact(
    request: ContactRequest,
    *,
    resolver: Callable[[str], list[str]] = system_resolver,
    transport: httpx.BaseTransport | None = None,
    clock: Clock | None = None,
) -> ContactResult:
    result = ContactResult(run_uuid=request.run_uuid)
    if request.website is None:
        website = guess_website(request, resolver=resolver, transport=transport, clock=clock)
        if website is None:
            result.status = "failed"
            result.errors.append({"category": "not_found", "message": "no website of this company was found from its name"})
            return result
        request.website = website
        result.website_guessed = True
    host = (urlsplit(request.website).hostname or "").lower()
    if not host:
        result.status = "failed"
        result.errors.append({"category": "validation_error", "message": "website has no host"})
        return result

    domain = registrable_domain(host)
    deadline = Deadline(clock or Clock(), request.timeout_s)
    queue = [request.website.rstrip("/") + "/"]
    seen: set[str] = set()
    general: list[str] = []

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
                elif email not in general:
                    general.append(email)

            if result.recruitment_email is not None:
                break

    result.general_email = best_general_mailbox(general)
    if result.pages == 0:
        result.status = "failed"
    return result
