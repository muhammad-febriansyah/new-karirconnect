"""Process entry point used by Laravel.

    python -m karir_crawler.cli < request.json > response.json

Exit codes: 0 = a response was produced (even for a failed crawl),
2 = the request was invalid, 1 = the worker itself crashed.
"""

from __future__ import annotations

import json
import sys
import traceback
from typing import TextIO

from .contract import CONTRACT_VERSION, CrawlRequest, InvalidRequest
from .runner import run

# Room for ~10k recently seen URLs.
MAX_REQUEST_BYTES = 4_000_000


def _error_response(run_uuid: str, message: str) -> dict:
    return {
        "contract_version": CONTRACT_VERSION,
        "run_uuid": run_uuid,
        "status": "failed",
        "engine_used": None,
        "engines_attempted": [],
        "company": None,
        "items": [],
        "errors": [{"engine": None, "category": "unknown", "message": message, "retryable": False,
                    "http_status": None, "url": None, "retry_after_s": None, "context": None}],
        "stats": {},
    }


def main(stdin: TextIO = sys.stdin, stdout: TextIO = sys.stdout, runner=run) -> int:
    raw = stdin.read(MAX_REQUEST_BYTES + 1)
    run_uuid = ""
    try:
        if len(raw) > MAX_REQUEST_BYTES:
            raise InvalidRequest("request is too large")
        try:
            data = json.loads(raw)
        except ValueError as exc:
            raise InvalidRequest(f"request is not valid JSON: {exc}") from exc
        if isinstance(data, dict) and isinstance(data.get("run_uuid"), str):
            run_uuid = data["run_uuid"]
        request = CrawlRequest.from_dict(data)
    except InvalidRequest as exc:
        json.dump(_error_response(run_uuid, f"invalid request: {exc}"), stdout)
        return 2

    try:
        response = runner(request).to_dict()
    except Exception as exc:  # noqa: BLE001 - report any crash as JSON
        traceback.print_exc(file=sys.stderr)
        json.dump(_error_response(run_uuid, f"worker crashed: {type(exc).__name__}: {exc}"), stdout)
        return 1

    json.dump(response, stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
