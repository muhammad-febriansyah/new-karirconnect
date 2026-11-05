"""Runs one crawl: strategy -> bounded fallback chain -> validation -> status."""

from __future__ import annotations

from collections.abc import Callable

import httpx

from . import strategy
from .contract import CrawlRequest, CrawlResponse, EngineAttempt, ErrorRecord
from .errors import CrawlFailure, RateLimited, SsrfBlocked, TimeoutFailure
from .http import Clock, Deadline, SafeClient
from .safety import Resolver, UrlGuard, system_resolver
from .validate import filter_valid


def _record(failure: CrawlFailure, engine: str | None) -> ErrorRecord:
    return ErrorRecord(
        engine=engine,
        category=failure.category,
        message=failure.message,
        retryable=failure.retryable,
        http_status=failure.http_status,
        url=failure.url,
        retry_after_s=failure.retry_after_s if isinstance(failure, RateLimited) else None,
    )


def _location_filter(items, request: CrawlRequest):
    """Keep items whose location mentions one of config.location_keywords,
    e.g. ["Indonesia", "Jakarta"] for a global company's board."""
    keywords = [str(k).lower() for k in request.source.config.get("location_keywords") or [] if str(k).strip()]
    if not keywords:
        return items
    return [item for item in items if any(k in (item.location_text or "").lower() for k in keywords)]


def _ms(clock: Clock, start: float) -> int:
    return int((clock.monotonic() - start) * 1000)


def run(
    request: CrawlRequest,
    *,
    transport: httpx.BaseTransport | None = None,
    resolver: Resolver = system_resolver,
    clock: Clock | None = None,
) -> CrawlResponse:
    clock = clock or Clock()
    response = CrawlResponse(run_uuid=request.run_uuid, status="failed")
    guard = UrlGuard(request.source.allowed_domains, resolver)

    try:
        guard.check(request.source.base_url)
    except SsrfBlocked as failure:
        response.errors.append(_record(failure, None))
        return response

    steps = strategy.plan(request)
    if not any(adapter for _, adapter, _ in steps):
        for engine, _, reason in steps:
            response.engines_attempted.append(EngineAttempt(engine=engine, outcome=reason))
        response.errors.append(
            ErrorRecord(
                engine=None,
                category="unknown",
                message=f"no implemented engine for source type {request.source.type!r} among {list(request.engines)}",
            )
        )
        return response

    deadline = Deadline(clock, request.limits.timeout_s)
    with SafeClient(
        guard,
        user_agent=request.user_agent,
        rate_per_minute=request.limits.rate_per_minute,
        deadline=deadline,
        respect_robots=request.respect_robots,
        transport=transport,
    ) as client:
        for engine, adapter, reason in steps:
            if adapter is None:
                response.engines_attempted.append(EngineAttempt(engine=engine, outcome=reason))
                continue

            started = clock.monotonic()
            try:
                result = adapter.fetch(client, request)
            except CrawlFailure as failure:
                response.errors.append(_record(failure, engine))
                stop = failure.stops_fallback or isinstance(failure, (RateLimited, TimeoutFailure))
                response.engines_attempted.append(
                    EngineAttempt(engine=engine, outcome="stopped" if stop else "failed", ms=_ms(clock, started))
                )
                if failure.stops_fallback and not isinstance(failure, SsrfBlocked):
                    response.status = "access_restricted"
                if stop:
                    break
                continue

            items, rejected = filter_valid(_location_filter(result.items, request), engine)
            response.engines_attempted.append(
                EngineAttempt(engine=engine, outcome="ok", ms=_ms(clock, started), items=len(items))
            )
            response.engine_used = engine
            response.company = result.company
            response.items = items
            response.errors.extend(result.warnings)
            response.errors.extend(rejected)
            response.stats.update(
                pages=result.pages, rejected=len(rejected), truncated=int(result.truncated), unread_left=result.unread_left,
            )

            if result.interrupted_by is not None:
                response.errors.append(_record(result.interrupted_by, engine))
                response.status = "access_restricted" if result.interrupted_by.stops_fallback else "partial"
            elif result.truncated:
                response.status = "partial"
            elif len(items) < request.expected_min_items:
                response.status = "suspected_partial"
            else:
                response.status = "succeeded"
            break

        response.stats["requests"] = client.requests
    response.stats["items"] = len(response.items)
    return response
