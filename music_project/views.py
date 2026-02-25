from django.http import HttpResponse
from django.db import connection
from django.core.cache import cache


def health_check(request):
    try:
        connection.ensure_connection()
    except Exception:
        return HttpResponse("Database Unavailable", status=503)

    try:
        cache.set("health_check_status", "ok", timeout=5)
        if not cache.get("health_check_status"):
            raise Exception("Redis not responding")
    except Exception:
        return HttpResponse("Redis Unavailable", status=503)

    return HttpResponse("OK")
