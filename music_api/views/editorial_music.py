import hashlib
import logging
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from time import struct_time
from urllib.parse import urljoin, urlparse
from xml.etree import ElementTree

import feedparser
import requests
from bs4 import BeautifulSoup
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


logger = logging.getLogger(__name__)

PITCHFORK_RSS_URL = "https://pitchfork.com/feed/feed-album-reviews/rss"
PITCHFORK_HOSTS = {"pitchfork.com", "www.pitchfork.com"}
PITCHFORK_CACHE_KEY = "editorial-music-feed:pitchfork:v2"
PITCHFORK_CACHE_TIMEOUT = 10 * 60
PITCHFORK_LIMIT = 21
PITCHFORK_HTTP_TIMEOUT = 5
PITCHFORK_USER_AGENT = (
    "RubySound.fm/1.0 "
    "(musicPlatform_api_django; contact: admin@rubysound.fm)"
)
SUMMARY_MAX_LENGTH = 320
MEDIA_NAMESPACE = "http://search.yahoo.com/mrss/"
ARTICLE_ALLOWED_TAGS = {
    "a", "blockquote", "br", "code", "div", "em", "figcaption", "figure",
    "h1", "h2", "h3", "h4", "h5", "h6", "hr", "img", "li", "ol", "p",
    "pre", "span", "strong", "table", "tbody", "td", "tfoot", "th",
    "thead", "tr", "ul",
}


def _published_at(entry):
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if isinstance(parsed, struct_time):
        return datetime(*parsed[:6], tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")

    value = entry.get("published") or entry.get("pubDate") or entry.get("pubdate")
    if not value:
        return ""
    try:
        parsed_date = parsedate_to_datetime(str(value))
        if parsed_date.tzinfo is None:
            parsed_date = parsed_date.replace(tzinfo=timezone.utc)
        return parsed_date.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except (TypeError, ValueError, OverflowError):
        return str(value)


def parse_release_title(title):
    """Make a small, best-effort artist/release projection from a review title."""
    if not title:
        return None, None

    cleaned = re.sub(r"\s+album review\s*$", "", str(title).strip(), flags=re.I)
    for separator in (" — ", " – ", " - ", ": ", " | "):
        if separator not in cleaned:
            continue
        artist, release = (part.strip() for part in cleaned.split(separator, 1))
        if artist and release and not artist.casefold().startswith("album review"):
            return artist, release
    return None, None


def _summary_from_entry(entry):
    description = entry.get("description") or entry.get("summary") or ""
    summary = BeautifulSoup(str(description), "html.parser").get_text(" ", strip=True)
    if len(summary) <= SUMMARY_MAX_LENGTH:
        return summary
    return f"{summary[:SUMMARY_MAX_LENGTH].rstrip()}…"


def _is_pitchfork_url(url):
    parsed = urlparse(str(url or "").strip())
    return parsed.scheme == "https" and parsed.hostname in PITCHFORK_HOSTS and bool(parsed.path)


def _extract_media_thumbnails(xml_content):
    thumbnails = {}
    try:
        root = ElementTree.fromstring(xml_content)
    except (ElementTree.ParseError, TypeError, ValueError):
        return thumbnails

    for item in root.findall(".//item"):
        guid = item.findtext("guid") or ""
        link = item.findtext("link") or ""
        thumbnail = item.find(f".//{{{MEDIA_NAMESPACE}}}thumbnail")
        thumbnail_url = thumbnail.attrib.get("url") if thumbnail is not None else None
        if thumbnail_url:
            if guid:
                thumbnails[guid] = thumbnail_url
            if link:
                thumbnails[link] = thumbnail_url
    return thumbnails


def _entry_thumbnail_fallback(entry):
    media_thumbnails = entry.get("media_thumbnail") or []
    if isinstance(media_thumbnails, list):
        for thumbnail in media_thumbnails:
            if isinstance(thumbnail, dict) and thumbnail.get("url"):
                return thumbnail["url"]
    return None


def _entry_to_result(entry, cover_url=None):
    title = str(entry.get("title") or "").strip()
    source_url = str(entry.get("link") or "").strip()
    guid = str(entry.get("id") or entry.get("guid") or source_url).strip()
    artist, release = parse_release_title(title)
    item_id = hashlib.sha256(source_url.encode("utf-8")).hexdigest()
    cover_url = cover_url or _entry_thumbnail_fallback(entry)
    creator = str(
        entry.get("author") or entry.get("creator") or entry.get("dc_creator") or ""
    )
    category = str(entry.get("category") or "")
    if not category and entry.get("tags"):
        category = str((entry.get("tags") or [{}])[0].get("term") or "")

    return {
        "id": f"pitchfork-{item_id}",
        "title": title,
        "guid": guid,
        "source_url": source_url,
        "url": source_url,
        "link": source_url,
        "published_at": _published_at(entry),
        "artist": artist,
        "release": release,
        "cover_url": cover_url,
        "image_url": cover_url,
        "rating": None,
        "summary": _summary_from_entry(entry),
        "author": creator,
        "creator": creator,
        "category": category,
        "source": "pitchfork",
        "source_name": "Pitchfork",
    }


def _load_pitchfork_reviews():
    response = requests.get(
        PITCHFORK_RSS_URL,
        headers={"User-Agent": PITCHFORK_USER_AGENT, "Accept": "application/rss+xml, application/xml"},
        timeout=PITCHFORK_HTTP_TIMEOUT,
    )
    response.raise_for_status()
    parsed_feed = feedparser.parse(response.content)
    if getattr(parsed_feed, "bozo", False):
        logger.warning("Pitchfork RSS was not valid XML: %s", parsed_feed.bozo_exception)
        return []

    thumbnails = _extract_media_thumbnails(response.content)
    results = []
    for entry in parsed_feed.entries:
        source_url = str(entry.get("link") or "").strip()
        if not entry.get("title") or not _is_pitchfork_url(source_url):
            continue
        guid = str(entry.get("id") or entry.get("guid") or "").strip()
        results.append(_entry_to_result(entry, thumbnails.get(guid) or thumbnails.get(source_url)))
        if len(results) == PITCHFORK_LIMIT:
            break
    return results


def _safe_article_asset(raw_url, source_url):
    if not raw_url:
        return None
    absolute_url = urljoin(source_url, str(raw_url).strip())
    parsed = urlparse(absolute_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return absolute_url


def _sanitize_pitchfork_html(raw_html, source_url):
    soup = BeautifulSoup(raw_html or "", "html.parser")
    for element in soup.find_all(
        ["base", "button", "embed", "form", "input", "link", "meta", "noscript", "object", "script", "select", "style", "textarea", "template", "iframe"]
    ):
        element.decompose()

    for element in soup.find_all(True):
        if element.name not in ARTICLE_ALLOWED_TAGS:
            element.unwrap()
            continue
        if element.name == "a":
            href = _safe_article_asset(element.get("href"), source_url)
            element.attrs = {"href": href} if href else {}
        elif element.name == "img":
            image_url = _safe_article_asset(element.get("src"), source_url)
            if not image_url:
                element.decompose()
                continue
            element.attrs = {
                "src": image_url,
                "alt": element.get("alt") or "",
                "loading": "lazy",
            }
        else:
            element.attrs = {
                key: value
                for key, value in element.attrs.items()
                if key in {"alt", "colspan", "height", "rowspan", "scope", "title", "width"}
            }
    return "".join(str(child) for child in soup.contents)


def _extract_pitchfork_article(raw_html, source_url):
    soup = BeautifulSoup(raw_html, "html.parser")
    main = soup.find("article") or soup.find("main")
    if not main:
        main = soup.find(
            lambda tag: tag.name in {"div", "section"}
            and any(
                token in " ".join(tag.get("class", [])).casefold()
                for token in ("article", "review", "content", "entry")
            )
        )
    if not main:
        main = soup.body or soup
    for element in main.find_all(["header", "nav", "footer", "aside"]):
        element.decompose()

    title_element = soup.find("meta", attrs={"property": "og:title"})
    title = title_element.get("content", "") if title_element else ""
    h1 = soup.find("h1")
    if not title and h1:
        title = h1.get_text(" ", strip=True)
    date_element = soup.find("meta", attrs={"property": "article:published_time"})
    published_at = date_element.get("content", "") if date_element else ""
    if not published_at:
        time_element = soup.find("time", datetime=True)
        published_at = time_element.get("datetime", "") if time_element else ""

    sanitized_html = _sanitize_pitchfork_html(
        "".join(str(child) for child in main.contents), source_url
    )
    images = [
        image["src"]
        for image in BeautifulSoup(sanitized_html, "html.parser").find_all("img", src=True)
    ]
    return {
        "title": title,
        "published_at": published_at,
        "source_url": source_url,
        "source": "pitchfork",
        "source_name": "Pitchfork",
        "html": sanitized_html,
        "images": list(dict.fromkeys(images)),
    }


def _fetch_pitchfork_article(source_url):
    current_url = source_url
    for _ in range(3):
        response = requests.get(
            current_url,
            headers={"User-Agent": PITCHFORK_USER_AGENT, "Accept": "text/html"},
            timeout=PITCHFORK_HTTP_TIMEOUT,
            allow_redirects=False,
        )
        if response.is_redirect or response.is_permanent_redirect:
            next_url = urljoin(current_url, response.headers.get("Location", ""))
            if not _is_pitchfork_url(next_url):
                raise ValueError("Pitchfork article redirect host is not allowed")
            current_url = next_url
            continue
        response.raise_for_status()
        return _extract_pitchfork_article(response.text, current_url)
    raise ValueError("Too many Pitchfork article redirects")


@api_view(["GET"])
@permission_classes([AllowAny])
def editorial_music_feed(request):
    cached_results = cache.get(PITCHFORK_CACHE_KEY)
    if cached_results is not None:
        return Response({"results": cached_results})

    try:
        results = _load_pitchfork_reviews()
    except (requests.RequestException, ValueError, TypeError) as exc:
        logger.warning("Unable to load Pitchfork RSS: %s", exc, exc_info=True)
        results = []
    except Exception:
        logger.exception("Unexpected Pitchfork RSS error")
        results = []

    cache.set(PITCHFORK_CACHE_KEY, results, timeout=PITCHFORK_CACHE_TIMEOUT)
    return Response({"results": results})


@api_view(["GET"])
@permission_classes([AllowAny])
def editorial_music_article(request):
    source_url = (request.GET.get("url") or "").strip()
    if not _is_pitchfork_url(source_url):
        return Response({"error": "Invalid Pitchfork article URL"}, status=400)

    try:
        response = Response(_fetch_pitchfork_article(source_url))
        response["Cache-Control"] = "no-store"
        return response
    except Exception:
        logger.warning("Unable to load Pitchfork article: %s", source_url, exc_info=True)
        return Response(
            {
                "error": "Не удалось загрузить рецензию Pitchfork",
                "source_url": source_url,
                "source": "pitchfork",
            },
            status=502,
        )
