import io
import json

import httpx

from karir_crawler.cli import main
from karir_crawler.contract import CONTRACT_VERSION, CrawlResponse
from karir_crawler.runner import run

from .conftest import fixture_json, fixture_text, make_request, public_resolver

GH_JOBS = "https://boards-api.greenhouse.io/v1/boards/contohtek/jobs"


def test_access_restricted_stops_without_fallback(router, clock):
    route = router.get(GH_JOBS).respond(403)

    response = run(make_request("greenhouse", engines=["api", "http", "browser"]), resolver=public_resolver, clock=clock)

    assert response.status == "access_restricted"
    assert route.call_count == 1
    assert [(a.engine, a.outcome) for a in response.engines_attempted] == [("api", "stopped")]


def test_captcha_page_is_access_restricted(router, clock):
    router.get(GH_JOBS).respond(200, text=fixture_text("captcha.html"), headers={"content-type": "text/html"})

    response = run(make_request("greenhouse"), resolver=public_resolver, clock=clock)

    assert response.status == "access_restricted"
    assert response.errors[0].category == "captcha"


def test_parse_error_falls_back_once_per_engine_then_fails(router, clock):
    router.get(GH_JOBS).respond(200, text="not json", headers={"content-type": "application/json"})

    response = run(make_request("greenhouse", engines=["api", "http", "api"]), resolver=public_resolver, clock=clock)

    assert response.status == "failed"
    # "api" listed twice still runs once; "http" is not an engine greenhouse supports.
    assert [(a.engine, a.outcome) for a in response.engines_attempted] == [("api", "failed"), ("http", "skipped")]
    assert response.errors[0].category == "parse_error"


def test_long_rate_limit_ends_run_with_retry_after(router, clock):
    router.get(GH_JOBS).respond(429, headers={"retry-after": "900"})

    response = run(make_request("greenhouse"), resolver=public_resolver, clock=clock)

    assert response.status == "failed"
    assert response.errors[0].category == "rate_limited"
    assert response.errors[0].retry_after_s == 900


def test_fewer_items_than_expected_is_suspected_partial(router, clock):
    router.get(GH_JOBS).respond(200, json=fixture_json("greenhouse_jobs.json"))
    router.get("https://boards-api.greenhouse.io/v1/boards/contohtek").respond(404)
    router.get("https://job-boards.greenhouse.io/contohtek").respond(404)

    response = run(make_request("greenhouse", expected_min_items=50), resolver=public_resolver, clock=clock)

    assert response.status == "suspected_partial"
    assert len(response.items) == 2


def test_base_url_outside_allowlist_is_blocked_before_any_request(router, clock):
    request = make_request("greenhouse", source={"base_url": "https://evil.example.net/jobs"})

    response = run(request, resolver=public_resolver, clock=clock)

    assert response.status == "failed"
    assert response.errors[0].category == "ssrf_blocked"
    assert not router.calls


def test_private_dns_is_blocked(router, clock):
    response = run(make_request("greenhouse"), resolver=lambda host: ["10.0.0.7"], clock=clock)

    assert response.errors[0].category == "ssrf_blocked"
    assert not router.calls


def test_platform_sources_never_crawl(router, clock):
    request = make_request("platform", engines=["api", "http", "browser"])

    response = run(request, resolver=public_resolver, clock=clock)

    assert response.status == "failed"
    assert not router.calls


def test_timeout_budget_stops_run(router, clock):
    def slow(request):
        clock.now += 500
        return httpx.Response(503)

    router.get(GH_JOBS).mock(side_effect=slow)

    response = run(make_request("greenhouse", limits={"timeout_s": 120}), resolver=public_resolver, clock=clock)

    assert response.status == "failed"
    assert response.errors[0].category in {"timeout", "network"}
    assert router.routes[-1].call_count == 1


def test_cli_round_trip(router, clock):
    def fake_runner(request):
        return CrawlResponse(run_uuid=request.run_uuid, status="succeeded")

    request = {
        "contract_version": CONTRACT_VERSION,
        "run_uuid": "abc",
        "source": {"type": "lever", "base_url": "https://api.lever.co/v0/postings/x", "allowed_domains": ["api.lever.co"]},
    }
    out = io.StringIO()

    code = main(io.StringIO(json.dumps(request)), out, runner=fake_runner)

    body = json.loads(out.getvalue())
    assert code == 0
    assert body["run_uuid"] == "abc"
    assert body["status"] == "succeeded"
    assert body["contract_version"] == CONTRACT_VERSION


def test_cli_invalid_request():
    for raw in ("not json", json.dumps({"contract_version": 99}), json.dumps({"contract_version": 1, "run_uuid": "x", "source": {"type": "ftp"}})):
        out = io.StringIO()
        assert main(io.StringIO(raw), out) == 2
        body = json.loads(out.getvalue())
        assert body["status"] == "failed"
        assert body["errors"][0]["message"].startswith("invalid request")


def test_cli_reports_crash_as_json():
    def boom(request):
        raise RuntimeError("kaboom")

    request = {
        "contract_version": CONTRACT_VERSION,
        "run_uuid": "abc",
        "source": {"type": "lever", "base_url": "https://api.lever.co/v0/postings/x", "allowed_domains": ["api.lever.co"]},
    }
    out = io.StringIO()

    assert main(io.StringIO(json.dumps(request)), out, runner=boom) == 1
    assert "kaboom" in json.loads(out.getvalue())["errors"][0]["message"]
