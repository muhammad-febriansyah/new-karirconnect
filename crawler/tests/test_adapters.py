import copy

import httpx

from karir_crawler.runner import run

from .conftest import fixture_json, fixture_text, make_request, public_resolver

GH_API = "https://boards-api.greenhouse.io/v1/boards/contohtek"
LEVER_API = "https://api.lever.co/v0/postings/contohtek"


def mock_greenhouse(router, jobs=None):
    router.get(f"{GH_API}/jobs").respond(200, json=jobs or fixture_json("greenhouse_jobs.json"))
    router.get(GH_API).respond(200, json=fixture_json("greenhouse_board.json"))
    router.get("https://job-boards.greenhouse.io/contohtek").respond(
        200, text=fixture_text("greenhouse_board_page.html"), headers={"content-type": "text/html"}
    )


def test_greenhouse_maps_items_to_job_post_fields(router, clock):
    mock_greenhouse(router)

    response = run(make_request("greenhouse"), resolver=public_resolver, clock=clock)

    assert response.status == "succeeded"
    assert response.engine_used == "api"
    assert [item.external_id for item in response.items] == ["4011001", "4011002"]

    first = response.items[0]
    assert first.title == "Backend Engineer (Go)"
    assert "platform logistik" in first.description
    assert "Build APIs in Go" in first.responsibilities
    assert "3+ tahun" in first.requirements
    assert "BPJS" in first.benefits
    assert first.location_text == "Jakarta, Indonesia"
    assert first.employment_type_raw == "Full-time"
    assert first.workplace_type_raw == "Hybrid"
    assert first.department_raw == "Engineering"
    assert first.application_deadline == "2026-12-31"
    assert first.apply_url.startswith("https://job-boards.greenhouse.io/")

    second = response.items[1]
    assert second.published_at is None  # not invented from updated_at
    assert second.employment_type_raw is None


def test_greenhouse_company_profile_and_logo(router, clock):
    mock_greenhouse(router)

    company = run(make_request("greenhouse"), resolver=public_resolver, clock=clock).company

    assert company.name == "Contoh Teknologi"
    assert "logistik" in company.about
    assert company.logo_url == "https://job-boards.greenhouse.io/logos/contohtek.png"


def test_greenhouse_company_website_fills_profile_gaps(router, clock):
    mock_greenhouse(router)
    router.get("https://www.contohtek.co.id/").respond(
        200, text=fixture_text("company_site.html"), headers={"content-type": "text/html"}
    )
    request = make_request(
        "greenhouse",
        source={
            "allowed_domains": ["boards-api.greenhouse.io", "job-boards.greenhouse.io", "contohtek.co.id"],
            "config": {"board_token": "contohtek", "company_website": "https://www.contohtek.co.id/"},
        },
    )

    company = run(request, resolver=public_resolver, clock=clock).company

    assert company.name == "Contoh Teknologi"  # API name wins
    assert company.logo_url.endswith("/logos/contohtek.png")  # board page logo found first
    assert company.founded_year == 2017
    assert company.phone == "+62 21 555 0100"


def test_greenhouse_profile_failure_is_not_fatal(router, clock):
    router.get(f"{GH_API}/jobs").respond(200, json=fixture_json("greenhouse_jobs.json"))
    router.get(GH_API).respond(500)
    router.get("https://job-boards.greenhouse.io/contohtek").respond(403)

    response = run(make_request("greenhouse"), resolver=public_resolver, clock=clock)

    assert response.status == "succeeded"
    assert len(response.items) == 2
    warnings = [e for e in response.errors if e.context and e.context.get("non_fatal")]
    assert {w.category for w in warnings} == {"network", "access_restricted"}


def test_greenhouse_rejects_invalid_items(router, clock):
    mock_greenhouse(router)

    response = run(make_request("greenhouse"), resolver=public_resolver, clock=clock)

    rejected = [e for e in response.errors if e.category == "validation_error"]
    assert len(rejected) == 1
    assert rejected[0].context["external_id"] == "4011003"
    assert response.stats["rejected"] == 1


def test_lever_maps_lists_salary_and_workplace(router, clock):
    router.get(LEVER_API).respond(200, json=[fixture_json("lever_posting.json")])
    router.get("https://jobs.lever.co/contohtek").respond(
        200, text=fixture_text("greenhouse_board_page.html"), headers={"content-type": "text/html"}
    )

    response = run(make_request("lever"), resolver=public_resolver, clock=clock)

    assert response.status == "succeeded"
    item = response.items[0]
    assert item.title == "Product Designer"
    assert item.apply_url.endswith("/apply")
    assert "Design flows" in item.responsibilities
    assert "Figma" in item.requirements
    assert "Asuransi" in item.benefits
    assert "<h3>Our stack</h3>" in item.description
    assert item.employment_type_raw == "Full Time"
    assert item.workplace_type_raw == "onsite"
    assert item.department_raw == "Design / Product"
    assert (item.salary.min, item.salary.max, item.salary.currency) == (15000000, 25000000, "IDR")
    assert item.published_at.startswith("2026-")
    assert response.company.name == "Contoh Teknologi"
    assert response.company.logo_url == "https://jobs.lever.co/logos/contohtek.png"


def lever_postings(count, start=0):
    base = fixture_json("lever_posting.json")
    postings = []
    for index in range(start, start + count):
        posting = copy.deepcopy(base)
        posting["id"] = f"posting-{index}"
        postings.append(posting)
    return postings


def test_lever_paginates(router, clock):
    route = router.get(LEVER_API)
    route.side_effect = lambda request: httpx.Response(
        200, json=lever_postings(100 if request.url.params["skip"] == "0" else 30, int(request.url.params["skip"]))
    )
    router.get("https://jobs.lever.co/contohtek").respond(404)

    response = run(make_request("lever"), resolver=public_resolver, clock=clock)

    assert response.status == "succeeded"
    assert len(response.items) == 130
    assert response.stats["pages"] == 2


def test_lever_max_pages_marks_run_partial(router, clock):
    route = router.get(LEVER_API)
    route.side_effect = lambda request: httpx.Response(200, json=lever_postings(100, int(request.url.params["skip"])))
    router.get("https://jobs.lever.co/contohtek").respond(404)

    response = run(make_request("lever", limits={"max_pages": 2}), resolver=public_resolver, clock=clock)

    assert response.status == "partial"
    assert len(response.items) == 200


def test_lever_later_page_failure_keeps_earlier_items(router, clock):
    route = router.get(LEVER_API)
    route.side_effect = lambda request: (
        httpx.Response(200, json=lever_postings(100)) if request.url.params["skip"] == "0" else httpx.Response(403)
    )
    router.get("https://jobs.lever.co/contohtek").respond(404)

    response = run(make_request("lever"), resolver=public_resolver, clock=clock)

    assert response.status == "access_restricted"
    assert len(response.items) == 100
