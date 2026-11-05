"""Turns HTTP responses into typed failures (or lets them through)."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import httpx

from .errors import AccessRestricted, CaptchaDetected, CrawlFailure, NetworkError, NotFound, RateLimited

# Markers that only ever appear on a challenge/interstitial page.
STRONG_CAPTCHA_MARKERS = (
    "challenges.cloudflare.com",
    "cf-challenge",
    "cf_chl_",
    "captcha-delivery.com",
    "px-captcha",
    "verify you are human",
    "are you a robot",
)

# Widgets that real content pages also embed (e.g. an invisible reCAPTCHA on
# an application form). They only mean "blocked" when the page has almost no
# readable content besides the widget.
WEAK_CAPTCHA_MARKERS = (
    "g-recaptcha",
    "recaptcha/api.js",
    "recaptcha/enterprise",
    "h-captcha",
    "hcaptcha.com",
)

CONTENT_TEXT_THRESHOLD = 1500

_JOB_POSTING = re.compile(r"[\"']@type[\"']\s*:\s*\[?\s*[\"']jobposting[\"']")
_TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
_PASSWORD_INPUT = re.compile(r"<input[^>]+type=[\"']?password", re.I)
_LOGIN_WORDS = re.compile(r"\b(sign in|log in|login|masuk)\b", re.I)


def parse_retry_after(value: str | None, now: datetime | None = None) -> int | None:
    """Seconds to wait from a Retry-After header (delta-seconds or HTTP-date)."""
    if not value:
        return None
    value = value.strip()
    if value.isdigit():
        return int(value)
    try:
        moment = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    now = now or datetime.now(timezone.utc)
    return max(0, int((moment - now).total_seconds()))


_TAGS = re.compile(r"<(script|style|noscript)[^>]*>.*?</\1>|<[^>]+>", re.I | re.S)


def visible_text_length(body: str) -> int:
    return len(" ".join(_TAGS.sub(" ", body[:500_000]).split()))


def detect_block_page(body: str) -> type[AccessRestricted] | None:
    """Spot CAPTCHA challenges and login walls in an HTML body."""
    lowered = body[:200_000].lower()
    if any(marker in lowered for marker in STRONG_CAPTCHA_MARKERS):
        return CaptchaDetected
    # A page that carries JobPosting data was served in full, whatever widget
    # (or Content-Security-Policy entry) mentions a CAPTCHA.
    if (
        any(marker in lowered for marker in WEAK_CAPTCHA_MARKERS)
        and visible_text_length(body) < CONTENT_TEXT_THRESHOLD
        and not _JOB_POSTING.search(lowered)
    ):
        return CaptchaDetected
    title_match = _TITLE.search(body[:20_000])
    title = title_match.group(1) if title_match else ""
    if _PASSWORD_INPUT.search(body) and _LOGIN_WORDS.search(title):
        return AccessRestricted
    return None


def raise_for_response(response: httpx.Response) -> None:
    raise_for_status(
        response.status_code,
        {key.lower(): value for key, value in response.headers.items()},
        lambda: response.text,
        str(response.request.url) if response.request else None,
    )


def raise_for_status(status: int, headers: dict[str, str], body, url: str | None) -> None:
    """Shared by the HTTP client and the browser engine. `body` is a callable
    so the text is only read when it is needed."""
    response_headers = headers
    is_html = "html" in response_headers.get("content-type", "").lower()

    if status == 429 or (status == 503 and response_headers.get("retry-after")):
        raise RateLimited(
            f"HTTP {status} rate limited",
            retry_after_s=parse_retry_after(response_headers.get("retry-after")),
            url=url,
            http_status=status,
        )
    if status in (401, 403, 407, 451):
        blocked = detect_block_page(body()) if is_html else None
        error = blocked or AccessRestricted
        raise error(f"HTTP {status}: access restricted by the source", url=url, http_status=status)
    if status in (404, 410):
        raise NotFound(f"HTTP {status}: not found (check the board token / URL)", url=url, http_status=status)
    if status == 408 or status >= 500:
        raise NetworkError(f"HTTP {status} from source", url=url, http_status=status)
    if status >= 400:
        raise CrawlFailure(f"HTTP {status} from source", url=url, http_status=status)

    if is_html:
        blocked = detect_block_page(body())
        if blocked is not None:
            raise blocked("source served a CAPTCHA or login page", url=url, http_status=status)
