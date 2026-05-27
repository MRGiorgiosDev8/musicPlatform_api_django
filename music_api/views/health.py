from __future__ import annotations

from typing import Any

import httpx
from decouple import config
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET

LASTFM_KEY = config("LASTFM_KEY", default="")


def _check_postgres() -> tuple[bool, str]:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True, "ok"
    except Exception as exc:
        return False, str(exc)


def _check_redis_cache() -> tuple[bool, str]:
    try:
        cache.set("health:ready", "ok", timeout=15)
        value = cache.get("health:ready")
        if value != "ok":
            return False, "cache round-trip mismatch"
        return True, "ok"
    except Exception as exc:
        return False, str(exc)


def _check_lastfm() -> tuple[bool, str]:
    if not LASTFM_KEY:
        return False, "missing LASTFM_KEY"

    try:
        response = httpx.get(
            "https://ws.audioscrobbler.com/2.0/",
            params={
                "method": "chart.gettopartists",
                "api_key": LASTFM_KEY,
                "format": "json",
                "limit": 1,
            },
            timeout=httpx.Timeout(3.0, connect=1.5),
        )
        if response.status_code == 200:
            return True, "ok"
        return False, f"status {response.status_code}"
    except Exception as exc:
        return False, str(exc)


@require_GET
def live_health_view(request) -> JsonResponse:
    return JsonResponse({"status": "ok", "service": "rubysound", "check": "live"})


@require_GET
def ready_health_view(request) -> JsonResponse:
    postgres_ok, postgres_msg = _check_postgres()
    redis_ok, redis_msg = _check_redis_cache()
    lastfm_ok, lastfm_msg = _check_lastfm()

    checks: dict[str, dict[str, Any]] = {
        "postgres": {"ok": postgres_ok, "detail": postgres_msg},
        "redis_cache": {"ok": redis_ok, "detail": redis_msg},
        "lastfm_api": {"ok": lastfm_ok, "detail": lastfm_msg},
    }
    is_ready = all(item["ok"] for item in checks.values())

    status_code = 200 if is_ready else 503
    payload = {
        "status": "ok" if is_ready else "degraded",
        "service": "rubysound",
        "check": "ready",
        "checks": checks,
    }
    return JsonResponse(payload, status=status_code)
