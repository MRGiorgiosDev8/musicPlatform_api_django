from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from django.core.cache import cache
import asyncio
import logging
from asgiref.sync import async_to_sync

# Асинхронные сервисные функции
from .services_async import (
    _get_lastfm_artists_by_genre_async,
    _get_lastfm_artists_chart_async,
    _get_lastfm_releases_batch_async,
    _get_wikipedia_artist_bios_batch_async,
    _search_lastfm_artists_async,
)

DEFAULT_ARTIST_COUNT = 16
CACHE_TIMEOUT = 600  # 10 минут
CACHE_VERSION = "v5"

WIKIPEDIA_ARTIST_IMAGES_BATCH_LIMIT = 30
LASTFM_RELEASES_BATCH_LIMIT = 75
LASTFM_CHART_LIMIT = 75

logger = logging.getLogger(__name__)


async def _async_get_artists(genre=None, limit=DEFAULT_ARTIST_COUNT):
    """Асинхронное получение трендовых артистов с batch обогащением"""
    cache_key = f"trending_artists_full:{CACHE_VERSION}:{genre or 'all'}:{limit}"
    cached = cache.get(cache_key)
    if cached:
        return cached, True

    try:
        if genre:
            artists_raw = await _get_lastfm_artists_by_genre_async(genre, limit)
        else:
            artists_raw = await _get_lastfm_artists_chart_async(limit)

        if not artists_raw:
            return {"artists": []}, False

        artists_raw = artists_raw[:limit]
        artist_images_task = _get_wikipedia_artist_bios_batch_async(
            [art["name"] for art in artists_raw[:WIKIPEDIA_ARTIST_IMAGES_BATCH_LIMIT]],
            "ru",
        )

        releases_task = _get_lastfm_releases_batch_async(
            artists_raw[:LASTFM_RELEASES_BATCH_LIMIT]
        )

        artist_images, releases_data = await asyncio.gather(
            artist_images_task, releases_task, return_exceptions=True
        )

        if isinstance(artist_images, Exception):
            logger.error(f"Wikipedia artist image batch fail: {artist_images}")
            artist_images = {}

        if isinstance(releases_data, Exception):
            logger.error(f"Last.fm releases fail: {releases_data}")
            releases_data = {}

        enriched_artists = []
        for art in artists_raw:
            name = art["name"]
            enriched_artists.append(
                {
                    "name": name,
                    "photo_url": (artist_images.get(name) or {}).get("image_url") or "",
                    "listeners": art.get("listeners", 0),
                    "playcount": art.get("playcount", 0),
                    "releases": releases_data.get(name, []),
                }
            )

        # Сортируем по количеству прослушиваний (сначала listeners, потом playcount)
        enriched_artists.sort(
            key=lambda artist: (artist["listeners"], artist["playcount"]), reverse=True
        )

        data = {"artists": enriched_artists}
        cache.set(cache_key, data, timeout=CACHE_TIMEOUT)
        return data, False

    except Exception as e:
        logger.error(f"Critical error in _async_get_artists: {str(e)}", exc_info=True)
        return {"artists": []}, False


class TrendingArtistsAPIView(APIView):
    """API для получения топа артистов"""

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get(self, request):
        genre = request.query_params.get("genre")
        limit_str = request.query_params.get("limit", str(DEFAULT_ARTIST_COUNT))

        try:
            limit = int(limit_str)
            if limit <= 0 or limit > LASTFM_CHART_LIMIT:
                raise ValueError()
        except ValueError:
            return Response(
                {"error": f"Limit must be 1-{LASTFM_CHART_LIMIT}"}, status=400
            )

        try:
            data, cached_flag = async_to_sync(_async_get_artists)(genre, limit)

            response_data = {
                "artists": data.get("artists", []),
                "meta": {
                    "genre": genre or "all",
                    "count": len(data.get("artists", [])),
                    "limit": limit,
                    "cached": cached_flag,
                },
            }
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"TrendingArtistsAPIView error: {str(e)}", exc_info=True)
            return Response(
                {
                    "error": "Internal server error",
                    "details": "Failed to fetch artist charts",
                    "artists": [],
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ArtistSearchAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"error": "Query required", "results": []}, status=400)

        normalized_query = " ".join(query.split()).lower()
        locale = (request.META.get("HTTP_ACCEPT_LANGUAGE") or "").split(",")[
            0
        ].strip().lower() or "default"
        cache_key = f"artist_search:{normalized_query}:{locale}"

        cached = cache.get(cache_key)
        if isinstance(cached, list):
            return Response({"results": cached, "meta": {"cached": True}}, status=200)

        try:
            raw = async_to_sync(_search_lastfm_artists_async)(
                query, limit=LASTFM_CHART_LIMIT
            )
            results = []
            for artist in raw or []:
                name = str(artist.get("name") or "").strip()
                if not name:
                    continue
                results.append(
                    {
                        "name": name,
                        "url": artist.get("url") or "",
                        "listeners": int(artist.get("listeners") or 0),
                        "mbid": artist.get("mbid") or "",
                    }
                )
            cache.set(cache_key, results, timeout=CACHE_TIMEOUT)
            return Response({"results": results, "meta": {"cached": False}}, status=200)
        except Exception as e:
            logger.error("ArtistSearchAPIView error: %s", str(e), exc_info=True)
            return Response(
                {"error": "Internal server error", "results": []}, status=500
            )
