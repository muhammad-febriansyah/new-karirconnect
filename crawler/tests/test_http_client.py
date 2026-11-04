import httpx
import pytest

from karir_crawler.errors import AccessRestricted, NetworkError, RateLimited, SsrfBlocked
from karir_crawler.http import Deadline, SafeClient
from karir_crawler.safety import UrlGuard

from .conftest import PUBLIC_IP, public_resolver

BASE = "https://api.example.com"


def make_client(clock, resolver=public_resolver, timeout=120, rate=600):
    guard = UrlGuard(["example.com"], resolver)
    return SafeClient(guard, user_agent="TestBot", rate_per_minute=rate, deadline=Deadline(clock, timeout))


def test_follows_safe_redirects(router, clock):
    router.get(f"{BASE}/a").respond(302, headers={"location": "/b"})
    router.get(f"{BASE}/b").respond(200, json={"ok": True})
    with make_client(clock) as client:
        assert client.get_json(f"{BASE}/a") == {"ok": True}


def test_blocks_redirect_to_other_domain(router, clock):
    router.get(f"{BASE}/a").respond(302, headers={"location": "https://169.254.169.254/latest/meta-data"})
    with make_client(clock) as client, pytest.raises(SsrfBlocked):
        client.get(f"{BASE}/a")


def test_blocks_redirect_to_host_resolving_privately(router, clock):
    router.get(f"{BASE}/a").respond(302, headers={"location": "https://internal.example.com/"})
    resolver = lambda host: ["10.1.2.3"] if host == "internal.example.com" else [PUBLIC_IP]
    with make_client(clock, resolver) as client, pytest.raises(SsrfBlocked):
        client.get(f"{BASE}/a")


def test_honours_short_retry_after_then_succeeds(router, clock):
    route = router.get(f"{BASE}/jobs")
    route.side_effect = [httpx.Response(429, headers={"retry-after": "7"}), httpx.Response(200, json=[])]
    with make_client(clock) as client:
        assert client.get_json(f"{BASE}/jobs") == []
    assert 7 in clock.sleeps
    assert route.call_count == 2


def test_long_retry_after_stops_immediately(router, clock):
    route = router.get(f"{BASE}/jobs").respond(429, headers={"retry-after": "3600"})
    with make_client(clock) as client, pytest.raises(RateLimited) as caught:
        client.get(f"{BASE}/jobs")
    assert caught.value.retry_after_s == 3600
    assert route.call_count == 1


def test_server_errors_retry_with_bounded_attempts(router, clock):
    route = router.get(f"{BASE}/jobs").respond(503)
    with make_client(clock) as client, pytest.raises(NetworkError):
        client.get(f"{BASE}/jobs")
    assert route.call_count == 3


def test_forbidden_is_not_retried(router, clock):
    route = router.get(f"{BASE}/jobs").respond(403)
    with make_client(clock) as client, pytest.raises(AccessRestricted):
        client.get(f"{BASE}/jobs")
    assert route.call_count == 1


def test_respects_robots_disallow_and_crawl_delay(router, clock):
    router["robots"].respond(200, text="User-agent: *\nCrawl-delay: 5\nDisallow: /private\n")
    router.get(f"{BASE}/public").respond(200, json={})
    with make_client(clock) as client:
        client.get(f"{BASE}/public")
        client.get(f"{BASE}/public")
        with pytest.raises(AccessRestricted):
            client.get(f"{BASE}/private/x")
    assert 5 in [round(s) for s in clock.sleeps]


def test_transport_errors_become_network_failures(router, clock):
    router.get(f"{BASE}/jobs").mock(side_effect=httpx.ConnectError("boom"))
    with make_client(clock) as client, pytest.raises(NetworkError):
        client.get(f"{BASE}/jobs")
