from karir_crawler.company import extract_company_profile
from karir_crawler.sections import add_section, split_sections

from .conftest import fixture_text


def test_splits_sections_on_real_headings():
    sections = split_sections(
        "<div><p>Intro text.</p><h3>Responsibilities</h3><ul><li>Ship</li></ul>"
        "<p><strong>Kualifikasi:</strong></p><ul><li>S1</li></ul>"
        "<h4>What we offer</h4><ul><li>Remote</li></ul></div>"
    )
    assert "Intro text." in sections["description"]
    assert "Ship" in sections["responsibilities"]
    assert "S1" in sections["requirements"]
    assert "Remote" in sections["benefits"]


def test_without_known_headings_everything_stays_in_description():
    sections = split_sections("<h3>About the team</h3><p>We build things.</p>")
    assert "We build things." in sections["description"]
    assert sections["requirements"] is None
    assert sections["responsibilities"] is None


def test_unescapes_greenhouse_markup():
    sections = split_sections("&lt;h3&gt;Requirements&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;Go&lt;/li&gt;&lt;/ul&gt;")
    assert sections["requirements"] == "<ul><li>Go</li></ul>"


def test_empty_markup():
    assert split_sections(None) == {"description": None, "responsibilities": None, "requirements": None, "benefits": None}


def test_add_section_keeps_unknown_headings_in_description():
    sections = {"description": "<p>x</p>", "responsibilities": None, "requirements": None, "benefits": None}
    add_section(sections, "Our stack", "<ul><li>Go</li></ul>")
    add_section(sections, "Requirements", "<ul><li>SQL</li></ul>")
    assert "<h3>Our stack</h3>" in sections["description"]
    assert sections["requirements"] == "<ul><li>SQL</li></ul>"


def test_company_profile_from_json_ld():
    profile = extract_company_profile(fixture_text("company_site.html"), "https://www.contohtek.co.id/tentang")
    assert profile.name == "PT Contoh Teknologi Indonesia"
    assert profile.logo_url == "https://www.contohtek.co.id/img/logo-square.png"
    assert profile.email == "halo@contohtek.co.id"
    assert profile.phone == "+62 21 555 0100"
    assert profile.founded_year == 2017
    assert profile.size_raw == "51-200"
    assert profile.address == "Jl. Sudirman 1, Jakarta Selatan, DKI Jakarta"
    assert profile.tagline == "Logistik lebih cepat untuk semua."
    assert profile.domain == "contohtek.co.id"


def test_company_profile_from_third_party_board_keeps_only_images():
    profile = extract_company_profile(
        fixture_text("greenhouse_board_page.html"), "https://job-boards.greenhouse.io/contohtek", own_site=False
    )
    assert profile.logo_url == "https://job-boards.greenhouse.io/logos/contohtek.png"
    assert profile.cover_url == "https://s3.example-cdn.test/cover.jpg"
    # The ATS page's title, URL and host are not the company's.
    assert profile.name is None
    assert profile.website is None
    assert profile.domain is None


def test_splits_sections_nested_in_wrapper_divs():
    sections = split_sections(
        '<div class="content-intro"><p>Intro.</p></div>'
        "<div><h2>An overview of this role</h2><p>Overview.</p>"
        "<div><h3>What you\u2019ll do</h3><ul><li>Lead</li></ul></div>"
        "<div><h3>What you\u2019ll bring</h3><ul><li>Python</li></ul></div></div>"
        '<div class="content-conclusion"><p>EEO</p></div>'
    )
    assert "Intro." in sections["description"]
    assert "Overview." in sections["description"]
    assert sections["responsibilities"] == "<ul><li>Lead</li></ul>"
    assert sections["requirements"] == "<ul><li>Python</li></ul>"
    # A heading inside a wrapper does not leak past it: the closing
    # boilerplate goes back to the description.
    assert "EEO" in sections["description"]


def test_company_profile_with_nothing_to_find():
    profile = extract_company_profile("<html><body>hi</body></html>", "https://example.com/careers")
    assert profile.logo_url is None
    assert profile.about is None
    assert profile.domain == "example.com"
