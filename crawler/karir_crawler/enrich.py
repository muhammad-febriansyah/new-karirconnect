"""Fill in what JSON-LD leaves out, from data the page itself ships.

* Every posting: an application email written in the posting text.
* dealls.com: the job object Next.js embeds in the page (__NEXT_DATA__),
  which has responsibilities and requirements separately, the workplace
  type, city and country, and the employer's profile.
"""

from __future__ import annotations

import html as html_lib
import json
import re
from collections.abc import Callable
from urllib.parse import urlsplit

from bs4 import BeautifulSoup

from .contract import JobItem, Salary
from .extract import clean_url

_EMAIL = re.compile(r"(?<![\w.+-])([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})(?![\w-])")
# Addresses that belong to a platform or are placeholders, never the employer's.
_NOT_EMPLOYER = re.compile(r"@(dealls\.com|sejutacita\.id|example\.(com|org)|email\.com|domain\.com|glints\.com|jobstreet\.)|noreply|no-reply", re.I)


def find_contact_email(*texts: str | None) -> str | None:
    text = html_lib.unescape(" ".join(re.sub(r"<[^>]+>", " ", t) for t in texts if t))
    for match in _EMAIL.finditer(text):
        email = match.group(1).strip(".").lower()
        if not _NOT_EMPLOYER.search(email):
            return email
    return None


def _next_data(soup: BeautifulSoup) -> dict | None:
    script = soup.find("script", id="__NEXT_DATA__")
    if script is None:
        return None
    try:
        return json.loads(script.string or script.get_text() or "")
    except ValueError:
        return None


def _html(value) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = re.sub(r"(<p><br\s*/?></p>\s*)+", "", value).strip()
    return cleaned or None


# Dealls lists company benefits as codes; unknown codes are spelled out.
COMPANY_BENEFITS = {
    "competitivesalary": "Gaji kompetitif",
    "medicalleave": "Cuti sakit",
    "bonussystem": "Sistem bonus",
    "healthinsurance": "Asuransi kesehatan",
    "lifeinsurance": "Asuransi jiwa",
    "bpjs": "BPJS",
    "flexibleworkinghours": "Jam kerja fleksibel",
    "flexiblehours": "Jam kerja fleksibel",
    "remotework": "Kerja remote",
    "workfromhome": "Kerja dari rumah",
    "paidleave": "Cuti berbayar",
    "annualleave": "Cuti tahunan",
    "maternityleave": "Cuti melahirkan",
    "thr": "THR",
    "transportallowance": "Tunjangan transportasi",
    "mealallowance": "Tunjangan makan",
    "trainingdevelopment": "Pelatihan & pengembangan",
    "careerdevelopment": "Pengembangan karier",
    "stockoption": "Opsi saham",
    "freelunch": "Makan siang gratis",
    "gym": "Fasilitas olahraga",
}


def _benefit_label(code: str) -> str:
    key = re.sub(r"[^a-z]", "", code.lower())
    if key in COMPANY_BENEFITS:
        return COMPANY_BENEFITS[key]
    words = re.sub(r"(?<!^)(?=[A-Z])", " ", code).replace("_", " ").strip()
    return words[:1].upper() + words[1:].lower()


def _benefits_html(codes) -> str | None:
    labels = [_benefit_label(str(code)) for code in codes or [] if str(code).strip()]
    if not labels:
        return None
    return "<ul>" + "".join(f"<li>{html_lib.escape(label)}</li>" for label in dict.fromkeys(labels)) + "</ul>"


WORKPLACE = {"onsite": "onsite", "remote": "remote", "hybrid": "hybrid"}
EMPLOYMENT = {"fulltime": "Full-time", "parttime": "Part-time", "contract": "Contract", "internship": "Internship", "freelance": "Freelance"}


def dealls(item: JobItem, soup: BeautifulSoup) -> JobItem | None:
    data = _next_data(soup)
    try:
        job = data["props"]["pageProps"]["dehydratedState"]["queries"][0]["state"]["data"]
    except (KeyError, IndexError, TypeError):
        return item
    if not isinstance(job, dict):
        return item
    if job.get("closed") or job.get("status") not in (None, "active"):
        return None  # closed postings are not listed

    if (responsibilities := _html(job.get("responsibilities"))) is not None:
        item.responsibilities = responsibilities
    if (requirements := _html(job.get("requirements"))) is not None:
        item.requirements = requirements
    if (description := _html(job.get("description"))) is not None:
        item.description = description
    elif item.responsibilities or item.requirements:
        # JSON-LD repeats both sections in its description; keep them once.
        item.description = None

    workplace = str(job.get("workplaceType") or "").replace("_", "").replace("-", "").lower()
    item.workplace_type_raw = WORKPLACE.get(workplace, item.workplace_type_raw)
    types = [EMPLOYMENT.get(str(t).lower(), str(t)) for t in job.get("employmentTypes") or []]
    if types:
        item.employment_type_raw = ", ".join(types)

    location = job.get("location") or {}
    city = (location.get("city") or {}).get("name")
    country = (location.get("country") or {}).get("name")
    if city or country:
        item.location_text = ", ".join(part for part in (city, country) if part)

    salary = job.get("salaryRange")
    if isinstance(salary, dict) and (salary.get("start") or salary.get("end")):
        item.salary = Salary(min=salary.get("start"), max=salary.get("end"), currency="IDR", interval="month")

    if apply_url := job.get("externalPlatformApplyUrl"):
        item.apply_url = str(apply_url)

    company = job.get("company") or {}
    if company.get("name"):
        item.company_name = str(company["name"]).strip()
    item.company_logo_url = company.get("logoUrl") or item.company_logo_url
    item.company_website = company.get("website") or None
    item.company_about = _html(company.get("description"))
    item.company_industry_raw = company.get("sector") or None
    item.company_culture = _html(company.get("whatSpecial"))
    item.company_benefits = _benefits_html((company.get("insight") or {}).get("benefits"))
    company_city = ((company.get("location") or {}).get("city") or {}).get("name")
    if company_city:
        item.company_location_raw = str(company_city)

    # Skills the employer asks for, as Dealls tags them.
    preference = job.get("candidatePreference") or {}
    named = [str(skill.get("name")).strip() for skill in preference.get("skills") or [] if isinstance(skill, dict) and skill.get("name")]
    if named:
        item.skills_raw = list(dict.fromkeys([*item.skills_raw, *named]))

    size = company.get("size") or {}
    if size.get("start") or size.get("end"):
        item.company_size_raw = f"{size.get('start') or ''}-{size.get('end') or ''}".strip("-")
    return item


ENRICHERS: dict[str, Callable[[JobItem, BeautifulSoup], JobItem | None]] = {
    "dealls.com": dealls,
}


def enrich(items: list[JobItem], soup: BeautifulSoup, page_url: str) -> list[JobItem]:
    host = (urlsplit(page_url).hostname or "").removeprefix("www.")
    enricher = ENRICHERS.get(host)
    result = []
    for item in items:
        if len(items) == 1:
            # A page about one job: its own URL is what the sitemap or the
            # listing links to, so it is the stable source URL.
            item.source_url = clean_url(page_url)
        if enricher is not None and len(items) == 1:
            item = enricher(item, soup)
            if item is None:
                continue
        if item.contact_email is None:
            item.contact_email = find_contact_email(item.description, item.responsibilities, item.requirements, item.benefits)
        result.append(item)
    return result
