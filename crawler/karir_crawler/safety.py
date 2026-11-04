"""SSRF guard: every URL (including each redirect hop) must be https, on an
allowlisted host, and resolve only to public IP addresses."""

from __future__ import annotations

import ipaddress
import socket
from collections.abc import Callable, Iterable
from urllib.parse import urlsplit

from .errors import SsrfBlocked

Resolver = Callable[[str], list[str]]

ALLOWED_PORTS = {None, 443}


def system_resolver(host: str) -> list[str]:
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise SsrfBlocked(f"cannot resolve host {host!r}: {exc}") from exc
    return sorted({info[4][0] for info in infos})


def is_public_ip(raw: str) -> bool:
    ip = ipaddress.ip_address(raw.split("%", 1)[0])
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast and not ip.is_reserved


def host_allowed(host: str, allowed_domains: Iterable[str]) -> bool:
    host = host.lower().rstrip(".")
    for domain in allowed_domains:
        domain = domain.lower().rstrip(".")
        if host == domain or host.endswith("." + domain):
            return True
    return False


class UrlGuard:
    def __init__(self, allowed_domains: Iterable[str], resolver: Resolver = system_resolver) -> None:
        self.allowed_domains = tuple(allowed_domains)
        self.resolver = resolver

    def check(self, url: str, *, require_allowlist: bool = True) -> str:
        """Return the host when `url` is safe to fetch, else raise SsrfBlocked.

        `require_allowlist=False` is only for a browser page's subresources
        (scripts, styles) that live on CDNs: those still have to be https and
        resolve to public addresses.
        """
        parts = urlsplit(url)
        if parts.scheme != "https":
            raise SsrfBlocked(f"only https URLs are allowed: {url}", url=url)
        if parts.username or parts.password:
            raise SsrfBlocked("URLs with credentials are not allowed", url=url)

        host = (parts.hostname or "").lower()
        if not host:
            raise SsrfBlocked("URL has no host", url=url)
        try:
            ipaddress.ip_address(host)
        except ValueError:
            pass
        else:
            raise SsrfBlocked(f"IP literal hosts are not allowed: {host}", url=url)

        try:
            port = parts.port
        except ValueError as exc:
            raise SsrfBlocked(f"invalid port in {url}", url=url) from exc
        if port not in ALLOWED_PORTS:
            raise SsrfBlocked(f"port {port} is not allowed", url=url)

        if require_allowlist and not host_allowed(host, self.allowed_domains):
            raise SsrfBlocked(f"host {host} is not in the source allowlist", url=url)

        addresses = self.resolver(host)
        if not addresses:
            raise SsrfBlocked(f"host {host} did not resolve", url=url)
        for address in addresses:
            if not is_public_ip(address):
                raise SsrfBlocked(f"host {host} resolves to non-public address {address}", url=url)

        return host
