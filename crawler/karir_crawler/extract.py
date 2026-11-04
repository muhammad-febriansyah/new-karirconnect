"""Pull job postings out of a public HTML page.

1. schema.org JSON-LD `JobPosting` (what Google for Jobs reads) - preferred,
   because the site states each field explicitly.
2. CSS selectors from the source config - for sites without structured data.

Fields the page does not state stay None.
"""

from __future__ import annotations

import hashlib
import html as html_lib
import json
import re
from typing import Any
from urllib.parse import urljoin, urlsplit, urlunsplit, parse_qsl, urlencode

from bs4 import BeautifulSoup, Tag
from soupsieve import SelectorSyntaxError

from .contract import JobItem, Salary
from .errors import ParseError
from .sections import split_sections, unescape_if_needed

MAX_EXTERNAL_ID = 191
SELECTOR_FIELDS = ("title", "description", "responsibilities", "requirements", "benefits", "location", "employment_type", "department", "apply_url", "posted_at")
_TRACKING_PARAMS = re.compile(r"^(utm_|gh_src$|lever-source|source$|ref$|fbclid$|gclid$)", re.I)


def parse_html(markup: str) -> BeautifulSoup:
    return BeautifulSoup(markup, "html.parser")


def canonical_url(soup: BeautifulSoup, page_url: str) -> str:
    link = soup.find("link", rel=lambda value: value and "canonical" in value)
    href = link.get("href") if isinstance(link, Tag) else None
    url = urljoin(page_url, str(href)) if href else page_url
    return clean_url(url)


def clean_url(url: str) -> str:
    """Drop the fragment and tracking parameters so one page has one id."""
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not _TRACKING_PARAMS.match(k)]
    return urlunsplit((parts.scheme, parts.netloc.lower(), parts.path or "/", urlencode(query), ""))


def external_id_for(value: str) -> str:
    value = value.strip()
    if len(value) <= MAX_EXTERNAL_ID:
        return value
    return "sha256:" + hashlib.sha256(value.encode()).hexdigest()


def _as_html(text: str | None) -> str | None:
    """JSON-LD descriptions are HTML, entity-encoded HTML, or plain text."""
    if not text or not str(text).strip():
        return None
    text = unescape_if_needed(str(text))
    if "<" in text and ">" in text:
        return text
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    return "\n".join(f"<p>{html_lib.escape(p).replace(chr(10), '<br>')}</p>" for p in paragraphs)


def _str(value: Any) -> str | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _types(node: dict) -> set[str]:
    raw = node.get("@type")
    values = raw if isinstance(raw, list) else [raw]
    return {str(v).lower() for v in values if v}


def _walk(data: Any):
    if isinstance(data, list):
        for entry in data:
            yield from _walk(entry)
    elif isinstance(data, dict):
        yield data
        for key in ("@graph", "itemListElement", "item", "mainEntity"):
            if key in data:
                yield from _walk(data[key])


def json_ld_nodes(soup: BeautifulSoup):
    for script in soup.find_all("script", attrs={"type": re.compile(r"application/ld\+json", re.I)}):
        raw = script.string or script.get_text() or ""
        try:
            data = json.loads(raw)
        except ValueError:
            # Some sites put several objects or trailing commas in one tag.
            continue
        yield from _walk(data)


def _location(posting: dict) -> str | None:
    places = posting.get("jobLocation")
    places = places if isinstance(places, list) else [places]
    texts: list[str] = []
    for place in places:
        if isinstance(place, str):
            texts.append(place.strip())
            continue
        if not isinstance(place, dict):
            continue
        address = place.get("address", place)
        if isinstance(address, str):
            texts.append(address.strip())
        elif isinstance(address, dict):
            parts = [address.get(key) for key in ("addressLocality", "addressRegion", "addressCountry")]
            parts = [p.get("name") if isinstance(p, dict) else p for p in parts]
            text = ", ".join(str(p).strip() for p in parts if p and str(p).strip())
            if text:
                texts.append(text)
    if not texts:
        requirement = posting.get("applicantLocationRequirements")
        requirement = requirement[0] if isinstance(requirement, list) and requirement else requirement
        if isinstance(requirement, dict) and _str(requirement.get("name")):
            texts.append(f"Remote ({requirement['name']})")
    unique = list(dict.fromkeys(t for t in texts if t))
    return " / ".join(unique)[:255] or None


def _number(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        text = re.sub(r"[^\d.,]", "", value)
        # "25.000.000" / "25,000,000": thousands separators, not decimals.
        if re.fullmatch(r"\d{1,3}([.,]\d{3})+", text):
            return int(re.sub(r"[.,]", "", text))
        try:
            return int(float(text.replace(",", ""))) if text else None
        except ValueError:
            return None
    return None


def _salary(raw: Any) -> Salary | None:
    if not isinstance(raw, dict):
        return None
    value = raw.get("value")
    currency = _str(raw.get("currency"))
    if isinstance(value, dict):
        low = _number(value.get("minValue"))
        high = _number(value.get("maxValue"))
        exact = _number(value.get("value"))
        interval = _str(value.get("unitText"))
    else:
        low = high = None
        exact = _number(value)
        interval = None
    if low is None and high is None and exact is not None:
        low = high = exact
    if low is None and high is None:
        return None
    return Salary(min=low, max=high, currency=currency, interval=interval)


def _joined(value: Any) -> str | None:
    if isinstance(value, list):
        return ", ".join(v for v in (_str(item) for item in value) if v) or None
    return _str(value)


def _identifier(posting: dict) -> str | None:
    raw = posting.get("identifier")
    if isinstance(raw, dict):
        return _str(raw.get("value")) or _str(raw.get("@id"))
    return _str(raw)


def job_postings_from_json_ld(soup: BeautifulSoup, page_url: str) -> list[JobItem]:
    items: list[JobItem] = []
    for node in json_ld_nodes(soup):
        if "jobposting" not in _types(node):
            continue

        url = _str(node.get("url"))
        url = clean_url(urljoin(page_url, url)) if url else canonical_url(soup, page_url)
        sections = split_sections(_as_html(_str(node.get("description"))))
        # Prefer the structured fields when the site provides them separately.
        for field, key in (("responsibilities", "responsibilities"), ("requirements", "qualifications"), ("benefits", "jobBenefits")):
            if (value := _as_html(_joined(node.get(key)))) and not sections.get(field):
                sections[field] = value

        organization = node.get("hiringOrganization")
        company_name = _str(organization.get("name")) if isinstance(organization, dict) else _str(organization)
        logo = organization.get("logo") if isinstance(organization, dict) else None
        if isinstance(logo, dict):
            logo = logo.get("url") or logo.get("contentUrl")
        company_logo = urljoin(page_url, logo) if isinstance(logo, str) and logo.strip() else None
        location_type = _joined(node.get("jobLocationType"))
        identifier = _identifier(node)

        items.append(
            JobItem(
                external_id=external_id_for(f"{identifier}" if identifier else url),
                title=html_lib.unescape(_str(node.get("title")) or "").strip(),
                apply_url=url,
                source_url=url,
                company_name=company_name,
                company_logo_url=company_logo,
                location_text=_location(node),
                employment_type_raw=_joined(node.get("employmentType")),
                workplace_type_raw="remote" if location_type and "telecommute" in location_type.lower() else None,
                department_raw=_joined(node.get("occupationalCategory")) or _joined(node.get("industry")),
                salary=_salary(node.get("baseSalary")),
                skills_raw=[s for s in re.split(r"\s*[,;]\s*", _joined(node.get("skills")) or "") if s][:50],
                published_at=_str(node.get("datePosted")),
                application_deadline=_str(node.get("validThrough")),
                **sections,
            )
        )
    return items


def _select(soup: BeautifulSoup, selector: str | None) -> Tag | None:
    if not selector:
        return None
    try:
        found = soup.select_one(selector)
    except SelectorSyntaxError as exc:
        raise ParseError(f"invalid CSS selector {selector!r}: {exc}") from exc
    return found if isinstance(found, Tag) else None


def job_posting_from_selectors(soup: BeautifulSoup, page_url: str, selectors: dict[str, str]) -> JobItem | None:
    """One posting from a detail page using configured CSS selectors."""
    title_node = _select(soup, selectors.get("title"))
    title = title_node.get_text(" ", strip=True) if title_node else ""
    if not title:
        return None

    def text(field: str) -> str | None:
        node = _select(soup, selectors.get(field))
        value = node.get_text(" ", strip=True) if node else ""
        return value or None

    def inner_html(field: str) -> str | None:
        node = _select(soup, selectors.get(field))
        return node.decode_contents().strip() or None if node else None

    sections = split_sections(inner_html("description"))
    for field in ("responsibilities", "requirements", "benefits"):
        if (value := inner_html(field)) is not None:
            sections[field] = value

    url = canonical_url(soup, page_url)
    apply_node = _select(soup, selectors.get("apply_url"))
    apply_href = apply_node.get("href") if apply_node else None
    apply_url = urljoin(page_url, str(apply_href)) if apply_href else url

    return JobItem(
        external_id=external_id_for(url),
        title=title,
        apply_url=apply_url,
        source_url=url,
        location_text=(text("location") or "")[:255] or None,
        employment_type_raw=text("employment_type"),
        department_raw=text("department"),
        published_at=_iso_date(text("posted_at")),
        **sections,
    )


def _iso_date(value: str | None) -> str | None:
    """Accept only dates already written as ISO (2026-11-04...)."""
    if value and re.match(r"^\d{4}-\d{2}-\d{2}", value.strip()):
        return value.strip()
    return None


def extract_postings(markup: str, page_url: str, selectors: dict[str, str] | None) -> list[JobItem]:
    from .enrich import enrich  # noqa: PLC0415 - enrich imports this module

    soup = parse_html(markup)
    items = job_postings_from_json_ld(soup, page_url)
    if not items and selectors:
        item = job_posting_from_selectors(soup, page_url, selectors)
        items = [item] if item else []
    return enrich(items, soup, page_url)
