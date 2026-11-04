"""Split a job description into the same sections `job_posts` has.

Only splits on headings the source actually wrote ("Requirements",
"Kualifikasi", "What we offer", ...). Text before the first recognised
heading, and anything under headings we do not recognise, stays in
`description`. Nothing is rewritten or summarised.
"""

from __future__ import annotations

import html as html_lib
import re

from bs4 import BeautifulSoup, NavigableString, Tag

SECTION_KEYWORDS: dict[str, tuple[str, ...]] = {
    "benefits": (
        "benefit", "perks", "what we offer", "we offer", "what's in it for you",
        "why join", "compensation", "how we support you", "tunjangan", "fasilitas", "keuntungan",
    ),
    "requirements": (
        "requirement", "qualification", "what you'll need", "what you will need",
        "what you bring", "what you'll bring", "what you will bring", "what we're looking for", "what we are looking for",
        "who you are", "about you", "skill set", "skills", "must have", "nice to have",
        "you have", "kualifikasi", "persyaratan", "syarat", "kriteria",
    ),
    "responsibilities": (
        "responsibilit", "what you'll do", "what you will do", "your role",
        "in this role", "day to day", "day-to-day", "your mission", "key duties",
        "tanggung jawab", "tugas", "job desk", "jobdesk",
    ),
}

SECTION_KEYS = ("description", "responsibilities", "requirements", "benefits")
HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
MAX_HEADING_CHARS = 80


def classify_heading(text: str) -> str | None:
    normalized = re.sub(r"\s+", " ", text.replace("’", "'")).strip().lower().rstrip(":")
    if not normalized or len(normalized) > MAX_HEADING_CHARS:
        return None
    for key, keywords in SECTION_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            return key
    return None


def unescape_if_needed(markup: str) -> str:
    """Greenhouse returns HTML entity-encoded markup (&lt;p&gt;...)."""
    if "&lt;" in markup and "<" not in markup.replace("&lt;", ""):
        return html_lib.unescape(markup)
    return markup


def _heading_text(node: Tag) -> str | None:
    """Text of `node` if it reads as a heading, else None."""
    text = node.get_text(" ", strip=True)
    if not text or len(text) > MAX_HEADING_CHARS:
        return None
    if node.name in HEADING_TAGS:
        return text
    if node.name in {"p", "div", "span", "strong", "b"}:
        emphasised = " ".join(t.get_text(" ", strip=True) for t in node.find_all(["strong", "b"]))
        if node.name in {"strong", "b"} or emphasised == text or text.endswith(":"):
            return text
    return None


CONTAINER_TAGS = {"div", "section", "article", "main"}


def _has_known_heading(node: Tag) -> bool:
    for descendant in node.find_all(True):
        heading = _heading_text(descendant)
        if heading and classify_heading(heading):
            return True
    return False


def _walk(node: Tag | BeautifulSoup, result: dict[str, list[str]], current: str) -> str:
    """Append node's children to sections; returns the section in effect after it."""
    for child in node.children:
        if isinstance(child, NavigableString):
            if child.strip():
                result[current].append(str(child).strip())
            continue
        if not isinstance(child, Tag):
            continue
        heading = _heading_text(child)
        section = classify_heading(heading) if heading else None
        if section is not None:
            current = section
            continue
        # Sections are often wrapped in their own <div>s; look inside those
        # instead of filing the whole wrapper under the current section. A
        # heading inside a wrapper only applies within that wrapper.
        if child.name in CONTAINER_TAGS and _has_known_heading(child):
            _walk(child, result, current)
            continue
        result[current].append(str(child))
    return current


def split_sections(markup: str | None) -> dict[str, str | None]:
    result: dict[str, list[str]] = {key: [] for key in SECTION_KEYS}
    if markup and markup.strip():
        _walk(BeautifulSoup(unescape_if_needed(markup), "html.parser"), result, "description")

    return {key: ("\n".join(parts).strip() or None) for key, parts in result.items()}


def add_section(sections: dict[str, str | None], heading: str, body_html: str) -> None:
    """Put an already-separated block (e.g. a Lever list) where it belongs."""
    key = classify_heading(heading)
    if key is None:
        key = "description"
        if heading.strip():
            body_html = f"<h3>{html_lib.escape(heading.strip())}</h3>\n{body_html}"
    existing = sections.get(key)
    sections[key] = f"{existing}\n{body_html}" if existing else body_html
