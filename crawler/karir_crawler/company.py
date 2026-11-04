"""Extract a company profile (name, about, logo, ...) from a public page.

Sources, best first: schema.org JSON-LD (Organization or a JobPosting's
hiringOrganization), then the page's own logo image, apple-touch-icon and
Open Graph tags. Fields the page does not state stay None.
"""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import urljoin, urlsplit

from bs4 import BeautifulSoup, Tag

from .contract import CompanyProfile

ORG_TYPES = {"organization", "corporation", "localbusiness", "employmentagency", "ngo", "educationalorganization"}
_YEAR = re.compile(r"\b(18|19|20)\d{2}\b")


def domain_of(url: str | None) -> str | None:
    if not url:
        return None
    host = (urlsplit(url).hostname or "").lower()
    return host.removeprefix("www.") or None


def _absolute(page_url: str, value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    url = urljoin(page_url, value.strip())
    return url if urlsplit(url).scheme in {"http", "https"} else None


def _image_url(page_url: str, value: Any) -> str | None:
    if isinstance(value, list):
        value = value[0] if value else None
    if isinstance(value, dict):
        value = value.get("url") or value.get("contentUrl")
    return _absolute(page_url, value)


def _types(node: dict) -> set[str]:
    raw = node.get("@type")
    values = raw if isinstance(raw, list) else [raw]
    return {str(v).lower() for v in values if v}


def _walk_json_ld(data: Any):
    if isinstance(data, list):
        for entry in data:
            yield from _walk_json_ld(entry)
    elif isinstance(data, dict):
        yield data
        if "@graph" in data:
            yield from _walk_json_ld(data["@graph"])


def _organizations(soup: BeautifulSoup):
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or script.get_text() or "")
        except (ValueError, TypeError):
            continue
        for node in _walk_json_ld(data):
            types = _types(node)
            if types & ORG_TYPES:
                yield node
            elif "jobposting" in types and isinstance(node.get("hiringOrganization"), dict):
                yield node["hiringOrganization"]


def _address(value: Any) -> str | None:
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, list):
        value = value[0] if value else None
    if isinstance(value, dict):
        parts = [value.get(k) for k in ("streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry")]
        parts = [p.get("name") if isinstance(p, dict) else p for p in parts]
        text = ", ".join(str(p).strip() for p in parts if p and str(p).strip())
        return text or None
    return None


def _size(value: Any) -> str | None:
    if isinstance(value, (int, str)) and str(value).strip():
        return str(value).strip()
    if isinstance(value, dict):
        if value.get("value"):
            return str(value["value"])
        low, high = value.get("minValue"), value.get("maxValue")
        if low or high:
            return f"{low or ''}-{high or ''}".strip("-")
    return None


def _text(node: dict, key: str) -> str | None:
    value = node.get(key)
    return value.strip() or None if isinstance(value, str) else None


def _meta(soup: BeautifulSoup, *names: str) -> str | None:
    for name in names:
        tag = soup.find("meta", attrs={"property": name}) or soup.find("meta", attrs={"name": name})
        if isinstance(tag, Tag) and (content := tag.get("content")) and str(content).strip():
            return str(content).strip()
    return None


def _logo_img(soup: BeautifulSoup) -> str | None:
    """An <img> that the page itself marks as its logo."""
    for img in soup.find_all("img"):
        marker = " ".join(
            [str(img.get("alt") or ""), " ".join(img.get("class") or []), str(img.get("id") or "")]
            + [" ".join(parent.get("class") or []) for parent in img.parents if isinstance(parent, Tag)][:3]
        ).lower()
        if "logo" in marker and (src := img.get("src") or img.get("data-src")):
            return str(src)
    return None


def _touch_icon(soup: BeautifulSoup) -> str | None:
    for link in soup.find_all("link"):
        rel = " ".join(link.get("rel") or []).lower()
        if "apple-touch-icon" in rel and link.get("href"):
            return str(link["href"])
    return None


def extract_company_profile(markup: str, page_url: str, *, own_site: bool = True) -> CompanyProfile:
    """`own_site=False` is for third-party pages (an ATS-hosted job board):
    only the employer's logo/cover are trusted there, because the page's
    URL, title and description belong to the ATS, not the company."""
    soup = BeautifulSoup(markup, "html.parser")
    profile = CompanyProfile(profile_source_url=page_url)

    for org in _organizations(soup):
        email = _text(org, "email")
        candidate = CompanyProfile(
            name=_text(org, "name"),
            about=_text(org, "description"),
            website=_absolute(page_url, org.get("url")),
            logo_url=_image_url(page_url, org.get("logo")),
            cover_url=_image_url(page_url, org.get("image")),
            email=email.removeprefix("mailto:") if email else None,
            phone=_text(org, "telephone"),
            address=_address(org.get("address")),
            size_raw=_size(org.get("numberOfEmployees")),
            industry_raw=_text(org, "industry"),
        )
        if isinstance(org.get("foundingDate"), (str, int)) and (match := _YEAR.search(str(org["foundingDate"]))):
            candidate.founded_year = int(match.group(0))
        profile.merge(candidate)

    profile.merge(
        CompanyProfile(
            name=_meta(soup, "og:site_name"),
            tagline=_meta(soup, "og:description", "description"),
            logo_url=_absolute(page_url, _logo_img(soup)) or _absolute(page_url, _touch_icon(soup)),
            cover_url=_absolute(page_url, _meta(soup, "og:image", "twitter:image")),
        )
    )
    if profile.cover_url == profile.logo_url:
        profile.cover_url = None
    if not own_site:
        return CompanyProfile(logo_url=profile.logo_url, cover_url=profile.cover_url)

    if profile.tagline and len(profile.tagline) > 255:
        profile.tagline = profile.tagline[:252].rstrip() + "..."
    profile.website = profile.website or _absolute(page_url, "/")
    profile.domain = domain_of(profile.website) or domain_of(page_url)
    return profile
