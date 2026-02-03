from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from django.core.cache import cache
import asyncio
import logging
from decouple import config

# Асинхронные сервисные функции
from .services_async import (
    _get_lastfm_artists_by_genre_async,
    _get_lastfm_chart_async,
    _get_deezer_artists_batch_async,
    _get_lastfm_releases_batch_async
)

LASTFM_KEY = config("LASTFM_KEY")
DEFAULT_ARTIST_COUNT = 16
CACHE_TIMEOUT = 600  # 10 минут

DEEZER_ARTISTS_BATCH_LIMIT = 40
LASTFM_RELEASES_BATCH_LIMIT = 75
LASTFM_CHART_LIMIT = 75

logger = logging.getLogger(__name__)


async def _async_get_artists(genre=None, limit=DEFAULT_ARTIST_COUNT):
    """Асинхронное получение трендовых артистов с batch обогащением"""
    cache_key = f"trending_artists_full:{genre or 'all'}:{limit}"
    cached = cache.get(cache_key)
    if cached:
        return cached, True

    try:
        if genre:
            artists_raw = await _get_lastfm_artists_by_genre_async(genre, limit)
        else:
            artists_raw = await _get_lastfm_chart_async(limit)

        if not artists_raw:
            return {'artists': []}, False

        artists_raw = artists_raw[:limit]
        artist_names = [art['name'] for art in artists_raw]

        deezer_photos_task = _get_deezer_artists_batch_async(artist_names[:DEEZER_ARTISTS_BATCH_LIMIT])
        releases_task = _get_lastfm_releases_batch_async(artists_raw[:LASTFM_RELEASES_BATCH_LIMIT])

        deezer_photos, releases_data = await asyncio.gather(
            deezer_photos_task,
            releases_task,
            return_exceptions=True
        )

        if isinstance(deezer_photos, Exception):
            logger.error(f"Deezer batch fail: {deezer_photos}")
            deezer_photos = {}

        if isinstance(releases_data, Exception):
            logger.error(f"Last.fm releases fail: {releases_data}")
            releases_data = {}

        enriched_artists = []
        for art in artists_raw:
            name = art['name']
            enriched_artists.append({
                'name': name,
                'photo_url': deezer_photos.get(name) or '/static/images/default.svg',
                'listeners': art.get('listeners', 0),
                'playcount': art.get('playcount', 0),
                'releases': releases_data.get(name, [])
            })

        data = {'artists': enriched_artists}
        cache.set(cache_key, data, timeout=CACHE_TIMEOUT)
        return data, False

    except Exception as e:
        logger.error(f"Critical error in _async_get_artists: {str(e)}", exc_info=True)
        return {'artists': []}, False


class TrendingArtistsAPIView(APIView):
    """API для получения топа артистов"""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get(self, request):
        genre = request.query_params.get('genre')
        limit_str = request.query_params.get('limit', str(DEFAULT_ARTIST_COUNT))

        try:
            limit = min(int(limit_str), LASTFM_CHART_LIMIT)
            if limit <= 0: raise ValueError()
        except ValueError:
            return Response({'error': f'Limit must be 1-{LASTFM_CHART_LIMIT}'}, status=400)

        try:
            # Используем asyncio.run для консистентности с остальными View
            data, cached_flag = asyncio.run(_async_get_artists(genre, limit))

            response_data = {
                'artists': data.get('artists', []),
                'meta': {
                    'genre': genre or 'all',
                    'count': len(data.get('artists', [])),
                    'limit': limit,
                    'cached': cached_flag
                }
            }
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"TrendingArtistsAPIView error: {str(e)}")
            return Response({
                'error': 'Internal server error',
                'details': 'Failed to fetch artist charts'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)