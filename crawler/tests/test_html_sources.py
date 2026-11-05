import gzip

import httpx
import pytest

from karir_crawler import strategy
from karir_crawler.adapters import generic_html
from karir_crawler.engines import browser
from karir_crawler.engines.browser import route_decision
from karir_crawler.extract import clean_url, external_id_for, extract_postings, parse_html
from karir_crawler.errors import ParseError
from karir_crawler.http import Deadline, SafeClient
from karir_crawler.runner import run
from karir_crawler.safety import UrlGuard

from .conftest import PUBLIC_IP, fixture_text, make_request, public_resolver

BASE = "https://careers.example.com"
HTML = {"content-type": "text/html; charset=utf-8"}
XML = {"content-type": "application/xml"}


def html_route(router, path, fixture, status=200):
    router.get(f"{BASE}{path}").respond(status, text=fixture_text(fixture) if fixture else "", headers=HTML)


def sitemap_request(**overrides):
    source = {
        "base_url": f"{BASE}/sitemap.xml",
        "allowed_domains": ["careers.example.com"],
        "config": {"url_pattern": r"/jobs/"},
        **overrides.pop("source", {}),
    }
    return make_request("sitemap", source=source, engines=["http"], **overrides)


def careers_request(config=None, **overrides):
    source = {
        "base_url": f"{BASE}/careers",
        "allowed_domains": ["careers.example.com"],
        "config": config if config is not None else {"job_link_selector": "a.job-link"},
        **overrides.pop("source", {}),
    }
    return make_request("generic_html", source=source, engines=overrides.pop("engines", ["http"]), **overrides)


# --- extraction ---------------------------------------------------------------


def test_json_ld_job_posting_maps_to_job_post_fields():
    [item] = extract_postings(fixture_text("job_jsonld.html"), f"{BASE}/jobs/backend-engineer", None)

    assert item.external_id == "BE-2026-01"
    assert item.title == "Backend Engineer"
    assert item.apply_url == f"{BASE}/jobs/backend-engineer"
    assert item.company_name == "PT Contoh Teknologi"
    assert item.location_text == "Jakarta Selatan, DKI Jakarta, ID"
    assert item.employment_type_raw == "FULL_TIME"
    assert item.department_raw == "Engineering"
    assert "logistik" in item.description
    assert "Membangun API" in item.responsibilities
    assert "Golang" in item.requirements
    assert item.benefits == "<p>BPJS, asuransi swasta</p>"
    assert (item.salary.min, item.salary.max, item.salary.currency, item.salary.interval) == (15000000, 25000000, "IDR", "MONTH")
    assert item.published_at == "2026-10-01"
    assert item.application_deadline == "2026-12-31T23:59"


def test_json_ld_graph_remote_and_plain_text():
    [item] = extract_postings(fixture_text("job_jsonld_graph.html"), f"{BASE}/x", None)

    assert item.apply_url == f"{BASE}/jobs/data-analyst"
    assert item.external_id == f"{BASE}/jobs/data-analyst"
    assert item.workplace_type_raw == "remote"
    assert item.location_text == "Remote (Indonesia)"
    assert item.employment_type_raw == "CONTRACTOR"
    assert item.description == "<p>Analisis data penjualan.</p>\n<p>Bekerja dengan tim produk.</p>"
    assert item.salary is None
    assert item.published_at is None


def test_selectors_are_used_only_without_structured_data():
    rules = {"title": "h1.job-title", "location": ".job-location", "employment_type": ".job-type", "description": ".job-body", "apply_url": "a.apply"}

    [item] = extract_postings(fixture_text("job_selectors.html"), f"{BASE}/jobs/designer", rules)

    assert item.title == "Product Designer"
    assert item.location_text == "Bandung"
    assert item.employment_type_raw == "Full-time"
    assert "Mendesain" in item.description
    assert "Figma" in item.requirements
    assert item.apply_url == f"{BASE}/apply/designer"
    assert item.external_id == f"{BASE}/jobs/designer"

    # JSON-LD wins even when selectors are configured.
    [structured] = extract_postings(fixture_text("job_jsonld.html"), f"{BASE}/jobs/backend-engineer", rules)
    assert structured.external_id == "BE-2026-01"


def test_page_without_data_or_selectors_yields_nothing():
    assert extract_postings(fixture_text("job_selectors.html"), f"{BASE}/x", None) == []
    assert extract_postings(fixture_text("job_selectors.html"), f"{BASE}/x", {"title": "h2.nope"}) == []


def test_invalid_selector_is_a_parse_error():
    with pytest.raises(ParseError):
        extract_postings(fixture_text("job_selectors.html"), f"{BASE}/x", {"title": "h1[[["})


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("25.000.000", 25000000), ("25,000,000", 25000000), ("Rp 7.500.000", 7500000), ("1500.50", 1500), (12000000, 12000000), ("abc", None)],
)
def test_salary_numbers(raw, expected):
    from karir_crawler.extract import _number

    assert _number(raw) == expected


def test_clean_url_and_long_ids():
    assert clean_url(f"{BASE}/jobs/1?utm_source=x&id=7&gh_src=abc#apply") == f"{BASE}/jobs/1?id=7"
    long_id = external_id_for("https://careers.example.com/" + "a" * 300)
    assert long_id.startswith("sha256:") and len(long_id) <= 191


# --- sitemap ------------------------------------------------------------------


def mock_sitemap_site(router):
    router.get(f"{BASE}/sitemap.xml").respond(200, text=fixture_text("sitemap_index.xml"), headers=XML)
    router.get(f"{BASE}/sitemap-jobs.xml.gz").respond(200, content=gzip.compress(fixture_text("sitemap_jobs.xml").encode()))
    router.get(f"{BASE}/sitemap-pages.xml").respond(200, text=fixture_text("sitemap_pages.xml"), headers=XML)
    html_route(router, "/jobs/backend-engineer", "job_jsonld.html")
    html_route(router, "/jobs/data-analyst", "job_jsonld_graph.html")
    html_route(router, "/jobs/designer", "job_selectors.html")


def test_sitemap_index_gzip_and_url_pattern(router, clock):
    mock_sitemap_site(router)

    response = run(sitemap_request(), resolver=public_resolver, clock=clock)

    assert response.status == "succeeded"
    assert response.engine_used == "http"
    # Newest first; /about and the other domain are ignored; the designer
    # page has no JobPosting data and no selectors are configured.
    assert [item.title for item in response.items] == ["Data Analyst", "Backend Engineer"]
    assert response.company.logo_url == f"{BASE}/static/logo.png"
    assert not any(call.request.url.host == "evil.example.net" for call in router.calls)


def test_sitemap_with_selectors_reads_plain_pages(router, clock):
    mock_sitemap_site(router)
    request = sitemap_request(source={"config": {"url_pattern": "/jobs/", "selectors": {"title": "h1.job-title", "description": ".job-body"}}})

    response = run(request, resolver=public_resolver, clock=clock)

    assert {item.title for item in response.items} == {"Data Analyst", "Backend Engineer", "Product Designer"}


def test_sitemap_budget_marks_run_partial(router, clock):
    mock_sitemap_site(router)

    response = run(sitemap_request(limits={"max_pages": 4}), resolver=public_resolver, clock=clock)

    assert response.status == "partial"
    assert response.stats["truncated"] == 1


def test_sitemap_with_dtd_is_refused(router, clock):
    router.get(f"{BASE}/sitemap.xml").respond(200, text=fixture_text("sitemap_doctype.xml"), headers=XML)

    response = run(sitemap_request(), resolver=public_resolver, clock=clock)

    assert response.status == "failed"
    assert response.errors[0].category == "parse_error"
    assert "DTD" in response.errors[0].message


def test_failed_job_page_is_skipped_not_fatal(router, clock):
    mock_sitemap_site(router)
    router.routes[-3].respond(404)  # backend-engineer page

    response = run(sitemap_request(), resolver=public_resolver, clock=clock)

    assert response.status == "succeeded"
    assert [item.title for item in response.items] == ["Data Analyst"]
    assert any(error.context and error.context.get("non_fatal") for error in response.errors)


def test_refusal_on_a_job_page_stops_the_crawl_but_keeps_items(router, clock):
    mock_sitemap_site(router)
    router.routes[-3].respond(403)  # backend-engineer page, read second

    response = run(sitemap_request(), resolver=public_resolver, clock=clock)

    assert response.status == "access_restricted"
    assert [item.title for item in response.items] == ["Data Analyst"]
    assert not any(call.request.url.path == "/jobs/designer" for call in router.calls)


def test_invalid_url_pattern_fails_cleanly(router, clock):
    response = run(sitemap_request(source={"config": {"url_pattern": "("}}), resolver=public_resolver, clock=clock)

    assert response.status == "failed"
    assert response.errors[0].category == "parse_error"


# --- generic career pages -----------------------------------------------------


def mock_careers_site(router):
    # More specific route first: respx matches /careers for any query string.
    router.get(f"{BASE}/careers?page=2").respond(200, text=fixture_text("careers_listing_p2.html"), headers=HTML)
    html_route(router, "/careers", "careers_listing.html")
    html_route(router, "/careers/jobs/1", "job_jsonld.html")
    html_route(router, "/careers/jobs/2", "job_jsonld_graph.html")
    html_route(router, "/careers/jobs/4", "job_selectors.html")


def test_career_pages_follow_links_and_pagination(router, clock):
    mock_careers_site(router)
    request = careers_request({"job_link_selector": "a.job-link", "selectors": {"title": "h1.job-title"}})

    response = run(request, resolver=public_resolver, clock=clock)

    assert response.status == "succeeded"
    assert {item.title for item in response.items} == {"Backend Engineer", "Data Analyst", "Product Designer"}
    assert response.company.name == "Contoh Teknologi"
    assert response.company.logo_url == f"{BASE}/static/logo.png"
    assert not any(call.request.url.host == "evil.example.net" for call in router.calls)
    # The tracking parameter was stripped before fetching.
    assert any(str(call.request.url) == f"{BASE}/careers/jobs/1" for call in router.calls)


def test_career_pages_by_url_pattern(router, clock):
    mock_careers_site(router)

    response = run(careers_request({"url_pattern": r"/careers/jobs/\d+$"}), resolver=public_resolver, clock=clock)

    assert {item.title for item in response.items} == {"Backend Engineer", "Data Analyst"}
    assert not any(call.request.url.path == "/careers/culture" for call in router.calls)


def test_javascript_only_page_falls_back_to_unavailable_browser(router, clock, monkeypatch):
    html_route(router, "/careers", "spa_shell.html")
    monkeypatch.setitem(strategy.OPTIONAL_ENGINES, "browser", lambda: False)

    response = run(careers_request(engines=["http", "browser"], limits={"browser_allowed": True}), resolver=public_resolver, clock=clock)

    assert response.status == "failed"
    assert [(a.engine, a.outcome) for a in response.engines_attempted] == [("http", "failed"), ("browser", "unavailable")]
    assert response.errors[0].category == "parse_error"


def test_browser_is_skipped_unless_the_source_allows_it(router, clock):
    html_route(router, "/careers", "spa_shell.html")

    response = run(careers_request(engines=["http", "browser"]), resolver=public_resolver, clock=clock)

    assert [(a.engine, a.outcome) for a in response.engines_attempted] == [("http", "failed"), ("browser", "skipped")]


class FakeBrowser:
    """Stands in for Playwright: returns the page as if JavaScript had run."""

    engine = "browser"
    rendered = {f"{BASE}/careers": "careers_listing_p2.html", f"{BASE}/careers/jobs/4": "job_jsonld.html"}

    def __init__(self, client):
        self.client = client

    def __enter__(self):
        return self

    def html(self, url):
        self.client.before_request(url)
        return url, fixture_text(self.rendered[url])

    def close(self):
        pass


def test_falls_back_to_browser_when_http_finds_nothing(router, clock, monkeypatch):
    html_route(router, "/careers", "spa_shell.html")
    monkeypatch.setitem(strategy.OPTIONAL_ENGINES, "browser", lambda: True)
    monkeypatch.setattr(browser, "BrowserFetcher", FakeBrowser)

    response = run(careers_request(engines=["http", "browser"], limits={"browser_allowed": True}), resolver=public_resolver, clock=clock)

    assert response.status == "succeeded"
    assert response.engine_used == "browser"
    assert [(a.engine, a.outcome) for a in response.engines_attempted] == [("http", "failed"), ("browser", "ok")]
    assert [item.title for item in response.items] == ["Backend Engineer"]


def test_browser_route_guard():
    resolver = lambda host: ["10.0.0.5"] if host == "internal.example-cdn.com" else [PUBLIC_IP]
    guard = UrlGuard(["careers.example.com"], resolver)
    client = SafeClient(guard, user_agent="t", rate_per_minute=60, deadline=Deadline(clock=__import__("karir_crawler.http", fromlist=["Clock"]).Clock(), seconds=60))
    try:
        assert route_decision(client, f"{BASE}/careers", "document", True) == "continue"
        assert route_decision(client, "https://evil.example.net/", "document", True) == "abort"
        assert route_decision(client, "https://cdn.example-cdn.com/app.js", "script", False) == "continue"
        assert route_decision(client, "https://internal.example-cdn.com/x.js", "script", False) == "abort"
        assert route_decision(client, "http://cdn.example-cdn.com/app.js", "script", False) == "abort"
        assert route_decision(client, f"{BASE}/logo.png", "image", False) == "abort"
        assert route_decision(client, "data:text/css,body{}", "stylesheet", False) == "continue"
    finally:
        client.close()


def test_generic_html_listing_failure_is_fatal(router, clock):
    html_route(router, "/careers", None, status=503)

    response = run(careers_request(), resolver=public_resolver, clock=clock)

    assert response.status == "failed"
    assert response.errors[0].category == "network"


def test_budget_spent_without_any_posting_is_a_parse_error(router, clock):
    mock_careers_site(router)

    # Budget covers the two listing pages only, so no job page is read.
    response = run(careers_request(limits={"max_pages": 2}), resolver=public_resolver, clock=clock)

    assert response.status == "failed"
    assert response.errors[0].category == "parse_error"
    assert "page budget" in response.errors[0].message


# --- CAPTCHA detection and browser routing (from a real Greenhouse page) -------


def test_invisible_recaptcha_on_a_real_page_is_not_a_block():
    from karir_crawler.classifier import detect_block_page

    article = "<p>" + "Tanggung jawab dan kualifikasi lengkap. " * 80 + "</p>"
    form = '<form><div class="g-recaptcha" data-size="invisible"></div><script src="https://www.recaptcha.net/recaptcha/enterprise.js"></script></form>'

    assert detect_block_page(f"<html><body>{article}{form}</body></html>") is None
    assert detect_block_page(f"<html><body><h1>Verifikasi</h1>{form}</body></html>") is not None
    # A challenge page marker blocks regardless of how much text there is.
    assert detect_block_page(f"<html><body>{article}<script src='https://challenges.cloudflare.com/x.js'></script></body></html>") is not None



def test_a_short_page_with_job_posting_data_is_not_a_block():
    from karir_crawler.classifier import detect_block_page

    csp = '<meta http-equiv="Content-Security-Policy" content="script-src https://www.google.com/recaptcha/api.js">'
    data = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"JobPosting","title":"Driver"}</script>'

    assert detect_block_page(f"<html><head>{csp}{data}</head><body><div id=app></div></body></html>") is None
    assert detect_block_page(f"<html><head>{csp}</head><body><div id=app></div></body></html>") is not None

class FakeFrame:
    def __init__(self, parent=None):
        self.parent_frame = parent


class FakeRequest:
    def __init__(self, url, resource_type, navigation, frame):
        self.url, self.resource_type, self._navigation, self.frame = url, resource_type, navigation, frame

    def is_navigation_request(self):
        return self._navigation


class FakeRoute:
    def __init__(self, request):
        self.request = request
        self.result = None

    def abort(self, reason):
        self.result = "abort"

    def continue_(self):
        self.result = "continue"


def test_browser_drops_third_party_iframes_without_failing_the_page():
    from karir_crawler.http import Clock

    guard = UrlGuard(["careers.example.com"], public_resolver)
    client = SafeClient(guard, user_agent="t", rate_per_minute=60, deadline=Deadline(Clock(), 60))
    fetcher = browser.BrowserFetcher(client)
    main, child = FakeFrame(), FakeFrame(parent=object())

    def route(url, resource_type, navigation, frame):
        fake = FakeRoute(FakeRequest(url, resource_type, navigation, frame))
        fetcher._route(fake)
        return fake.result

    try:
        assert route("https://www.recaptcha.net/recaptcha/enterprise/anchor", "document", True, child) == "abort"
        assert fetcher._blocked == []
        assert route(f"{BASE}/careers/embed", "document", True, child) == "continue"
        assert route("https://cdn.example-cdn.com/app.js", "script", False, main) == "continue"
        assert route("https://evil.example.net/", "document", True, main) == "abort"
        assert fetcher._blocked == ["https://evil.example.net/"]
    finally:
        client.close()


def test_unread_pages_are_visited_first(router, clock):
    mock_sitemap_site(router)
    # Data Analyst is the newest page, but it was read in the last run.
    request = sitemap_request(limits={"max_pages": 4}, recently_seen=[f"{BASE}/jobs/data-analyst"])

    response = run(request, resolver=public_resolver, clock=clock)

    assert [item.title for item in response.items] == ["Backend Engineer"]
    assert not any(call.request.url.path == "/jobs/data-analyst" for call in router.calls)
    # The budget ran out with the designer page still unread: a follow-up
    # run has something to read.
    assert response.status == "partial"
    assert response.stats["unread_left"] == 1


def test_dealls_next_data_enriches_the_posting():
    import json as _json

    job = {
        "closed": False, "status": "active", "responsibilities": "<p><br></p><ul><li>Mengajar</li></ul>",
        "requirements": "<ul><li>S1 Pendidikan</li><li>Kirim CV ke rekrut@contohtek.co.id</li></ul>", "description": None,
        "workplaceType": "onSite", "employmentTypes": ["fullTime"],
        "location": {"country": {"name": "Indonesia"}, "city": {"name": "Sorong"}},
        "salaryRange": {"start": 5000000, "end": 7000000},
        "company": {"name": "Contoh Tek", "logoUrl": "https://cdn.example/logo.png", "website": "https://contohtek.co.id",
                    "description": "<p>Tentang kami</p>", "sector": "Education", "size": {"start": 50, "end": 100},
                    "whatSpecial": "<p><br></p><p>Kolaboratif</p>", "insight": {"benefits": ["competitiveSalary", "petFriendly"]},
                    "location": {"city": {"name": "Jakarta Selatan"}}},
        "candidatePreference": {"skills": [{"name": "Public Speaking"}, {"name": "Microsoft Excel"}]},
    }
    page = (
        '<script type="application/ld+json">{"@type":"JobPosting","title":"Pengajar","url":"https://dealls.com/loker/pengajar",'
        '"identifier":{"value":"abc"},"hiringOrganization":{"name":"Dealls"},"description":"<p>dup</p>"}</script>'
        '<script id="__NEXT_DATA__" type="application/json">'
        + _json.dumps({"props": {"pageProps": {"dehydratedState": {"queries": [{"state": {"data": job}}]}}}})
        + "</script>"
    )

    [item] = extract_postings(page, "https://dealls.com/loker/pengajar~contoh-tek?utm_source=x", None)

    assert item.source_url == "https://dealls.com/loker/pengajar~contoh-tek"
    assert item.company_name == "Contoh Tek"
    assert (item.company_website, item.company_size_raw, item.company_industry_raw) == ("https://contohtek.co.id", "50-100", "Education")
    assert item.responsibilities == "<ul><li>Mengajar</li></ul>"
    assert item.description is None
    assert (item.workplace_type_raw, item.employment_type_raw, item.location_text) == ("onsite", "Full-time", "Sorong, Indonesia")
    assert (item.salary.min, item.salary.max, item.salary.currency) == (5000000, 7000000, "IDR")
    assert item.contact_email == "rekrut@contohtek.co.id"
    assert item.company_culture == "<p>Kolaboratif</p>"
    assert item.company_benefits == "<ul><li>Gaji kompetitif</li><li>Pet friendly</li></ul>"
    assert item.company_location_raw == "Jakarta Selatan"
    assert item.skills_raw == ["Public Speaking", "Microsoft Excel"]


def test_closed_dealls_posting_is_dropped():
    import json as _json

    page = (
        '<script type="application/ld+json">{"@type":"JobPosting","title":"X","identifier":{"value":"1"}}</script>'
        '<script id="__NEXT_DATA__" type="application/json">'
        + _json.dumps({"props": {"pageProps": {"dehydratedState": {"queries": [{"state": {"data": {"closed": True}}}]}}}})
        + "</script>"
    )
    assert extract_postings(page, "https://dealls.com/loker/x~y", None) == []


def test_platform_and_placeholder_emails_are_ignored():
    from karir_crawler.enrich import find_contact_email

    assert find_contact_email("<p>Hubungi support@dealls.com atau nama@email.com</p>") is None
    assert find_contact_email("Kirim ke <b>HRD.Jakarta@PT-Maju.co.id</b>.") == "hrd.jakarta@pt-maju.co.id"
