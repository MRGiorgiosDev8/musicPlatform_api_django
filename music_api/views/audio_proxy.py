from urllib.parse import urlparse, urlsplit, urlunsplit, quote, parse_qs
import hashlib
import logging
import time

import httpx
from django.core.cache import cache
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden

logger = logging.getLogger(__name__)


ALLOWED_AUDIO_HOSTS = {
    "audio.itunes.apple.com",
    "audio-ssl.itunes.apple.com",
    "preview.itunes.apple.com",
}

ALLOWED_AUDIO_SUFFIXES = (
    ".mzstatic.com",
    ".dzcdn.net",
    ".deezer.com",
)

CACHE_TTL_SECONDS = 60 * 60 * 6
MAX_CACHE_BYTES = 5 * 1024 * 1024


def _is_allowed_audio_host(hostname: str) -> bool:
    if not hostname:
        return False
    if hostname in ALLOWED_AUDIO_HOSTS:
        return True
    return hostname.endswith(ALLOWED_AUDIO_SUFFIXES)


def _normalize_audio_url(raw_url: str) -> str:
    parts = urlsplit(raw_url)
    if not parts.scheme or not parts.netloc:
        return raw_url
    safe_query = quote(parts.query, safe="=&%~")
    return urlunsplit(
        (parts.scheme, parts.netloc, parts.path, safe_query, parts.fragment)
    )


def _cache_key_for_url(url: str) -> str:
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()
    return f"audio_proxy:{digest}"


def audio_proxy_view(request):
    raw_url = request.GET.get("url", "").strip()
    if not raw_url:
        return HttpResponseBadRequest("Missing url")

    parsed = urlparse(raw_url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return HttpResponseBadRequest("Invalid url")

    hostname = parsed.hostname or ""
    if not _is_allowed_audio_host(hostname):
        return HttpResponseForbidden("Host not allowed")

    query_params = parse_qs(parsed.query)
    if "hdnea" in query_params:
        hdnea_val = query_params.get("hdnea", [""])[0]
        for token in hdnea_val.split("~"):
            if token.startswith("exp="):
                try:
                    exp_ts = int(token.replace("exp=", "").strip())
                    if exp_ts and exp_ts < int(time.time()):
                        return HttpResponse(status=410, content="Preview expired")
                except ValueError:
                    pass

    cache_key = _cache_key_for_url(raw_url)
    cached = cache.get(cache_key)
    if isinstance(cached, dict) and cached.get("content"):
        resp = HttpResponse(
            content=cached["content"],
            status=200,
            content_type=cached.get("content_type", "audio/mpeg"),
        )
        if cached.get("content_length"):
            resp["Content-Length"] = cached["content_length"]
        if cached.get("accept_ranges"):
            resp["Accept-Ranges"] = cached["accept_ranges"]
        resp["Cache-Control"] = "public, max-age=86400"
        resp["X-Audio-Proxy-Cache"] = "HIT"
        return resp

    normalized_url = _normalize_audio_url(raw_url)

    headers = {
        "User-Agent": (
            "RubySound.fm/1.0 "
            "(musicPlatform_api_django; contact: admin@rubysound.fm)"
        ),
        "Accept": "*/*",
    }

    if hostname.endswith(".dzcdn.net") or hostname.endswith(".deezer.com"):
        headers["Referer"] = "https://www.deezer.com/"
        headers["Origin"] = "https://www.deezer.com"

    range_header = request.headers.get("Range")
    if range_header:
        headers["Range"] = range_header

    client = httpx.Client(
        timeout=httpx.Timeout(12.0, connect=3.0),
        follow_redirects=True,
    )

    upstream = None
    last_error = None
    for attempt in range(3):
        try:
            upstream = client.get(raw_url, headers=headers)
            break
        except httpx.HTTPError as exc:
            last_error = exc
            try:
                upstream = client.get(normalized_url, headers=headers)
                break
            except httpx.HTTPError as exc2:
                last_error = exc2
                time.sleep(0.15 * (attempt + 1))
                continue
    client.close()

    if upstream is None:
        logger.warning("Audio proxy upstream error: %s", last_error)
        return HttpResponseBadRequest("Upstream error")

    content_type = upstream.headers.get("content-type", "audio/mpeg")
    response = HttpResponse(
        content=upstream.content,
        status=upstream.status_code,
        content_type=content_type,
    )

    for header_name in ("Content-Length", "Accept-Ranges", "Content-Range"):
        header_value = upstream.headers.get(header_name)
        if header_value:
            response[header_name] = header_value

    response["Cache-Control"] = "public, max-age=86400"
    response["X-Audio-Proxy-Cache"] = "MISS"

    if upstream.status_code == 200 and not range_header:
        content_length = upstream.headers.get("Content-Length")
        body = upstream.content or b""
        if body and (len(body) <= MAX_CACHE_BYTES):
            cache.set(
                cache_key,
                {
                    "content": body,
                    "content_type": content_type,
                    "content_length": content_length,
                    "accept_ranges": upstream.headers.get("Accept-Ranges"),
                },
                timeout=CACHE_TTL_SECONDS,
            )
    return response
