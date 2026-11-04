import httpx

from karir_crawler.runner import run

from .conftest import make_request, public_resolver


def feed_request(feed, domain, base_url, **config):
    return make_request(
        "job_feed",
        source={"base_url": base_url, "allowed_domains": [domain], "config": {"feed": feed, **config}},
        engines=["api"],
    )


def test_remoteok_skips_the_legal_notice_and_maps_fields(router, clock):
    router.get("https://remoteok.com/api").respond(200, json=[
        {"legal": "API Terms of Service: link back"},
        {"id": "11", "position": "Backend Engineer", "company": "Acme", "company_logo": "https://cdn.example/acme.png",
         "url": "https://remoteok.com/remote-jobs/11", "apply_url": "https://remoteok.com/remote-jobs/11",
         "description": "<p>Build APIs</p><h3>Requirements</h3><ul><li>Go</li></ul>", "location": "Worldwide",
         "salary_min": 0, "salary_max": 0, "tags": ["go", "api"], "date": "2026-11-03T00:00:18+00:00"},
    ])

    response = run(feed_request("remoteok", "remoteok.com", "https://remoteok.com/api"), resolver=public_resolver, clock=clock)

    [item] = response.items
    assert response.status == "succeeded"
    assert (item.external_id, item.title, item.company_name) == ("11", "Backend Engineer", "Acme")
    assert item.company_logo_url == "https://cdn.example/acme.png"
    assert item.workplace_type_raw == "remote"
    assert item.salary is None  # 0 means "not stated"
    assert "Go" in item.requirements


def test_jobicy_passes_only_known_filters_and_follows_the_cursor(router, clock):
    route = router.get("https://jobicy.com/api/v2/remote-jobs")
    route.side_effect = lambda request: httpx.Response(200, json={
        "jobs": [{"id": request.url.params.get("cursor", "1"), "jobTitle": "Designer", "companyName": "Beta",
                  "url": f"https://jobicy.com/jobs/{request.url.params.get('cursor', '1')}", "jobGeo": "APAC",
                  "jobType": ["Full-Time"], "jobDescription": "<p>Design</p>", "pubDate": "2026-11-04T03:43:04+00:00"}],
        "nextCursor": None if request.url.params.get("cursor") else "2",
    })

    request = feed_request("jobicy", "jobicy.com", "https://jobicy.com/api/v2/remote-jobs", params={"geo": "apac", "evil": "x"})
    response = run(request, resolver=public_resolver, clock=clock)

    assert [item.external_id for item in response.items] == ["1", "2"]
    assert response.items[0].employment_type_raw == "Full-Time"
    assert response.items[0].apply_url == "https://jobicy.com/jobs/1"  # Jobicy: apply on the original page
    first_call = route.calls[0].request.url.params
    assert first_call["geo"] == "apac" and "evil" not in first_call


def test_himalayas_epoch_dates_and_salary(router, clock):
    router.get("https://himalayas.app/jobs/api").respond(200, json={"jobs": [{
        "guid": "https://himalayas.app/companies/acme/jobs/1", "title": "Data Analyst", "companyName": "Acme",
        "applicationLink": "https://himalayas.app/companies/acme/jobs/1", "description": "<p>Analyse</p>",
        "minSalary": 1000, "maxSalary": 2000, "currency": "USD", "salaryPeriod": "monthly",
        "locationRestrictions": ["Indonesia", "Singapore"], "pubDate": 1793776454, "expiryDate": 1798960452,
    }], "nextCursor": None})

    [item] = run(feed_request("himalayas", "himalayas.app", "https://himalayas.app/jobs/api"), resolver=public_resolver, clock=clock).items

    assert item.location_text == "Indonesia, Singapore"
    assert (item.salary.min, item.salary.max, item.salary.interval) == (1000, 2000, "monthly")
    assert item.published_at.startswith("2026-")
    assert item.application_deadline.startswith("2027-")


def test_unknown_feed_fails_cleanly(router, clock):
    response = run(feed_request("glints", "glints.com", "https://glints.com/api"), resolver=public_resolver, clock=clock)

    assert response.status == "failed"
    assert response.errors[0].category == "parse_error"


def test_location_keywords_keep_only_matching_jobs(router, clock):
    router.get("https://boards-api.greenhouse.io/v1/boards/contohtek/jobs").respond(200, json={"jobs": [
        {"id": 1, "title": "Engineer Jakarta", "absolute_url": "https://job-boards.greenhouse.io/x/jobs/1", "location": {"name": "Jakarta, Indonesia"}},
        {"id": 2, "title": "Engineer Berlin", "absolute_url": "https://job-boards.greenhouse.io/x/jobs/2", "location": {"name": "Berlin, Germany"}},
    ]})
    router.get("https://boards-api.greenhouse.io/v1/boards/contohtek").respond(404)
    router.get("https://job-boards.greenhouse.io/contohtek").respond(404)

    request = make_request("greenhouse", source={"config": {"board_token": "contohtek", "location_keywords": ["indonesia"]}})
    response = run(request, resolver=public_resolver, clock=clock)

    assert [item.title for item in response.items] == ["Engineer Jakarta"]
