import pytest

from karir_crawler.errors import SsrfBlocked
from karir_crawler.safety import UrlGuard, host_allowed, is_public_ip

from .conftest import public_resolver


def guard(resolver=public_resolver):
    return UrlGuard(["boards-api.greenhouse.io", "example.com"], resolver)


def test_allows_https_on_allowlisted_host_and_subdomain():
    assert guard().check("https://boards-api.greenhouse.io/v1/boards/x/jobs") == "boards-api.greenhouse.io"
    assert guard().check("https://careers.example.com/jobs") == "careers.example.com"


@pytest.mark.parametrize(
    "url",
    [
        "http://example.com/",  # plain http
        "https://evil.com/",  # not allowlisted
        "https://example.com.evil.com/",  # suffix trick
        "https://notexample.com/",  # no dot boundary
        "https://127.0.0.1/",  # IP literal
        "https://[::1]/",  # IPv6 literal
        "https://user:pw@example.com/",  # credentials
        "https://example.com:8443/",  # odd port
        "file:///etc/passwd",
        "gopher://example.com/",
    ],
)
def test_blocks_unsafe_urls(url):
    with pytest.raises(SsrfBlocked):
        guard().check(url)


@pytest.mark.parametrize(
    "address",
    ["10.0.0.5", "172.16.1.1", "192.168.1.1", "127.0.0.1", "169.254.169.254", "0.0.0.0", "::1", "fd00::1", "::ffff:10.0.0.1", "100.64.0.1"],
)
def test_blocks_hosts_resolving_to_private_addresses(address):
    with pytest.raises(SsrfBlocked):
        guard(lambda host: ["93.184.216.34", address]).check("https://example.com/")


def test_public_ip_detection():
    assert is_public_ip("93.184.216.34")
    assert not is_public_ip("169.254.169.254")


def test_host_allowed_is_case_insensitive():
    assert host_allowed("API.Example.COM", ["example.com"])
