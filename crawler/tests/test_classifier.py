from datetime import datetime, timedelta, timezone
from email.utils import format_datetime

import httpx
import pytest

from karir_crawler.classifier import parse_retry_after, raise_for_response
from karir_crawler.errors import AccessRestricted, CaptchaDetected, CrawlFailure, NetworkError, NotFound, RateLimited
from karir_crawler.retry import RetryPolicy

from .conftest import fixture_text


def response(status, text="", content_type="text/html", headers=None):
    request = httpx.Request("GET", "https://example.com/jobs")
    return httpx.Response(status, text=text, headers={"content-type": content_type, **(headers or {})}, request=request)


def test_retry_after_seconds_and_http_date():
    now = datetime(2026, 11, 4, 12, 0, tzinfo=timezone.utc)
    assert parse_retry_after("120") == 120
    assert parse_retry_after(format_datetime(now + timedelta(seconds=90), usegmt=True), now) == 90
    assert parse_retry_after("soon") is None
    assert parse_retry_after(None) is None


@pytest.mark.parametrize(
    ("status", "body", "expected"),
    [
        (429, "", RateLimited),
        (403, "<html>Forbidden</html>", AccessRestricted),
        (401, "", AccessRestricted),
        (403, fixture_text("captcha.html"), CaptchaDetected),
        (200, fixture_text("captcha.html"), CaptchaDetected),
        (200, fixture_text("login.html"), AccessRestricted),
        (404, "", NotFound),
        (500, "", NetworkError),
        (400, "", CrawlFailure),
    ],
)
def test_classifies_responses(status, body, expected):
    with pytest.raises(expected) as caught:
        raise_for_response(response(status, body))
    assert type(caught.value) is expected


def test_rate_limit_carries_retry_after():
    with pytest.raises(RateLimited) as caught:
        raise_for_response(response(429, headers={"retry-after": "30"}))
    assert caught.value.retry_after_s == 30


def test_ok_json_and_plain_html_pass():
    raise_for_response(response(200, '{"jobs": []}', "application/json"))
    raise_for_response(response(200, "<html><title>Careers</title><p>Jobs</p></html>"))


def test_retry_policy():
    policy = RetryPolicy(max_attempts=3, base_delay_s=1, max_delay_s=30, max_in_run_wait_s=60)
    network = NetworkError("x")
    assert policy.delay_for(network, 1) == 1
    assert policy.delay_for(network, 2) == 2
    assert policy.delay_for(network, 3) is None
    assert policy.delay_for(RateLimited("x", retry_after_s=45), 1) == 45
    assert policy.delay_for(RateLimited("x", retry_after_s=600), 1) is None
    assert policy.delay_for(AccessRestricted("x"), 1) is None
