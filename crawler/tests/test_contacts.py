import io
import json

import httpx

from karir_crawler.cli import main
from karir_crawler.contacts import (
    ContactRequest,
    emails_in,
    find_contact,
    is_recruitment_mailbox,
    registrable_domain,
)

from .conftest import public_resolver

SITE = "https://www.contoh.co.id"


def request(**overrides):
    data = {"contract_version": 1, "mode": "company_contact", "run_uuid": "r1", "website": SITE, **overrides}
    return ContactRequest.from_dict(data)


def test_registrable_domain_handles_country_second_levels():
    assert registrable_domain("careers.contoh.co.id") == "contoh.co.id"
    assert registrable_domain("www.contoh.com") == "contoh.com"
    assert registrable_domain("contoh.id") == "contoh.id"


def test_recruitment_mailboxes():
    for email in ["hr@x.id", "hrd.jakarta@x.id", "recruitment@x.id", "REQRUITMENT@x.id", "career@x.id", "karir@x.id", "hiring@x.id", "talent.acquisition@x.id"]:
        assert is_recruitment_mailbox(email), email
    for email in ["info@x.id", "christina@x.id", "support@x.id", "sales@x.id", "partnership@x.id"]:
        assert not is_recruitment_mailbox(email), email


def test_only_addresses_on_the_company_domain_count():
    page = 'Kirim ke <a href="mailto:HRD@contoh.co.id">HRD</a>, rekrut@gmail.com, logo@2x.png, noreply@contoh.co.id, hr@karir.contoh.co.id'
    assert emails_in(page, "contoh.co.id") == ["hrd@contoh.co.id", "hr@karir.contoh.co.id"]


def test_finds_the_recruitment_email_on_the_careers_page(router, clock):
    router.get(f"{SITE}/robots.txt").respond(404)
    router.get(f"{SITE}/").respond(200, html='<a href="/tentang">Tentang</a> <a href="/karir">Karir</a> info@contoh.co.id')
    router.get(f"{SITE}/karir").respond(200, html="Lamaran dikirim ke recruitment@contoh.co.id")

    result = find_contact(request(), resolver=public_resolver, clock=clock)

    assert result.status == "succeeded"
    assert (result.recruitment_email, result.recruitment_email_url) == ("recruitment@contoh.co.id", f"{SITE}/karir")
    assert result.general_email == "info@contoh.co.id"
    # /tentang has no hint of contact or careers: not read.
    assert not any(call.request.url.path == "/tentang" for call in router.calls)


def test_no_recruitment_email_leaves_it_empty(router, clock):
    router.get(f"{SITE}/robots.txt").respond(404)
    router.get(f"{SITE}/").respond(200, html="halo@contoh.co.id")
    router.route(host="www.contoh.co.id").respond(404)

    result = find_contact(request(), resolver=public_resolver, clock=clock)

    assert result.recruitment_email is None
    assert result.general_email == "halo@contoh.co.id"


def test_respects_robots_txt(router, clock):
    router.routes["robots"].respond(200, text="User-agent: *\nDisallow: /")

    result = find_contact(request(), resolver=public_resolver, clock=clock)

    assert result.status == "access_restricted"
    assert result.recruitment_email is None


def test_never_leaves_the_company_domain(router, clock):
    router.get(f"{SITE}/robots.txt").respond(404)
    router.get(f"{SITE}/").respond(200, html='<a href="https://other.example.com/careers">Careers</a>')
    router.route(host="www.contoh.co.id").respond(404)

    find_contact(request(), resolver=public_resolver, clock=clock)

    assert all(call.request.url.host == "www.contoh.co.id" for call in router.calls)


def test_cli_dispatches_contact_requests():
    stdout = io.StringIO()
    payload = {"contract_version": 1, "mode": "company_contact", "run_uuid": "r9", "website": SITE}

    def finder(req):
        assert req.website == SITE
        from karir_crawler.contacts import ContactResult

        return ContactResult(run_uuid=req.run_uuid, recruitment_email="hr@contoh.co.id")

    assert main(io.StringIO(json.dumps(payload)), stdout, contact_finder=finder) == 0
    response = json.loads(stdout.getvalue())
    assert (response["run_uuid"], response["recruitment_email"], response["contract_version"]) == ("r9", "hr@contoh.co.id", 1)


def test_plain_http_websites_are_read_over_https():
    assert request(website="http://contoh.co.id").website == "https://contoh.co.id"


_ = httpx  # respx fixtures patch httpx
