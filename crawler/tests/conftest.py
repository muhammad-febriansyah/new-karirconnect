from __future__ import annotations

import json
from pathlib import Path

import pytest
import respx

from karir_crawler.contract import CONTRACT_VERSION, CrawlRequest
from karir_crawler.http import Clock

FIXTURES = Path(__file__).parent / "fixtures"
PUBLIC_IP = "93.184.216.34"


def fixture_text(name: str) -> str:
    return (FIXTURES / name).read_text()


def fixture_json(name: str):
    return json.loads(fixture_text(name))


class FakeClock(Clock):
    """Time only moves when something sleeps, so tests never wait."""

    def __init__(self) -> None:
        self.now = 0.0
        self.sleeps: list[float] = []
        super().__init__(monotonic=lambda: self.now, sleep=self._sleep)

    def _sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self.now += seconds


def public_resolver(host: str) -> list[str]:
    return [PUBLIC_IP]


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock()


@pytest.fixture
def router():
    """respx router; robots.txt is 404 (no rules) on every host unless a test overrides it."""
    with respx.mock(assert_all_called=False) as mock:
        mock.get(url__regex=r"https://[^/]+/robots\.txt", name="robots").respond(404)
        yield mock


def make_request(source_type: str = "greenhouse", **overrides) -> CrawlRequest:
    defaults = {
        "greenhouse": {
            "base_url": "https://boards-api.greenhouse.io/v1/boards/contohtek/jobs",
            "allowed_domains": ["boards-api.greenhouse.io", "job-boards.greenhouse.io"],
            "config": {"board_token": "contohtek"},
        },
        "lever": {
            "base_url": "https://api.lever.co/v0/postings/contohtek",
            "allowed_domains": ["api.lever.co", "jobs.lever.co"],
            "config": {"company": "contohtek", "company_name": "Contoh Teknologi"},
        },
    }.get(source_type, {"base_url": "https://careers.example.com/", "allowed_domains": ["careers.example.com"], "config": {}})

    source = {"type": source_type, **defaults, **overrides.pop("source", {})}
    data = {
        "contract_version": CONTRACT_VERSION,
        "run_uuid": "run-1",
        "source": source,
        "limits": {"timeout_s": 120, "rate_per_minute": 600, **overrides.pop("limits", {})},
        "engines": overrides.pop("engines", ["api", "http"]),
        **overrides,
    }
    return CrawlRequest.from_dict(data)
