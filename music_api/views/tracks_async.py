from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.pagination import PageNumberPagination
from django.core.cache import cache
import asyncio
import logging
from decouple import config

# Асинхронные сервисные функции
from .services_async import (
    _get_lastfm_chart_async,
    _get_lastfm_tracks_by_genre_async,
    _search_lastfm_tracks_async,
    _get_itunes_batch_async,
    _get_deezer_batch_async
)

DEFAULT_TRACK_COUNT = 15
CACHE_TIMEOUT = 600  # 10 минут

ITUNES_BATCH_LIMIT = 25
DEEZER_BATCH_LIMIT = 40
LASTFM_BATCH_LIMIT = 75

logger = logging.getLogger(__name__)


class TrackPagination(PageNumberPagination):
    page_size = 14
    page_size_query_param = 'page_size'
    max_page_size = 30


async def _enrich_tracks_list_async(tracks_list):
    if not tracks_list:
        return []

    tracks_for_batch = []
    for tr in tracks_list:
        # Учитываем, что в чартах 'artist' это dict, а в поиске - str
        artist_name = tr['artist']['name'] if isinstance(tr['artist'], dict) else tr['artist']
        tracks_for_batch.append({
            'name': tr['name'],
            'artist': artist_name
        })

    itunes_batch = tracks_for_batch[:ITUNES_BATCH_LIMIT]
    deezer_batch = tracks_for_batch[:DEEZER_BATCH_LIMIT]

    # Запускаем batch запросы параллельно с правильными ограничениями
    itunes_task = _get_itunes_batch_async(itunes_batch)
    deezer_task = _get_deezer_batch_async(deezer_batch)

    itunes_data, deezer_data = await asyncio.gather(
        itunes_task,
        deezer_task,
        return_exceptions=True
    )

    # Обработка исключений
    itunes_data = itunes_data if not isinstance(itunes_data, Exception) else {}
    deezer_data = deezer_data if not isinstance(deezer_data, Exception) else {}

    # Собираем финальные данные
    enriched = []
    for tr in tracks_list:
        name = tr['name']
        artist = tr['artist']['name'] if isinstance(tr['artist'], dict) else tr['artist']
        track_key = (name, artist)

        it_res = itunes_data.get(track_key, {})
        dz_res = deezer_data.get(track_key, {})

        cover = it_res.get('cover') or dz_res.get('cover')
        preview = it_res.get('preview') or dz_res.get('preview')

        enriched.append({
            'name': name,
            'artist': artist,
            'listeners': tr.get('listeners', 0),
            'playcount': tr.get('playcount', 0),
            'url': preview or tr.get('url'),
            'image_url': cover or '/static/images/default.svg',
            'mbid': tr.get('mbid', '')
        })
    return enriched


class YearChartAPIView(APIView):
    """API для получения чарта треков"""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get(self, request):
        genre = request.query_params.get('genre')
        limit_str = request.query_params.get('limit', str(DEFAULT_TRACK_COUNT))

        try:

            limit = min(int(limit_str), LASTFM_BATCH_LIMIT)
            if limit <= 0: raise ValueError()
        except ValueError:
            return Response({'error': f'Limit must be 1-{LASTFM_BATCH_LIMIT}'}, status=400)

        cache_key = f"tracks_chart:{genre or 'all'}:{limit}"
        cached = cache.get(cache_key)
        if cached:
            return Response({'tracks': cached, 'meta': {'cached': True}}, status=200)

        try:

            if genre:
                raw = asyncio.run(_get_lastfm_tracks_by_genre_async(genre, limit))
            else:
                raw = asyncio.run(_get_lastfm_chart_async(limit))

            enriched = asyncio.run(_enrich_tracks_list_async(raw))

            cache.set(cache_key, enriched, timeout=CACHE_TIMEOUT)
            return Response({'tracks': enriched, 'meta': {'cached': False}}, status=200)
        except Exception as e:
            logger.error(f"Chart error: {e}")
            return Response({'error': 'Server error'}, status=500)


class TrackSearchAPIView(APIView):
    """API для поиска треков с пагинацией перед обогащением"""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    pagination_class = TrackPagination

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'Query required'}, status=400)

        try:
            cache_key_raw = f"search_raw:{query}"
            tracks_raw = cache.get(cache_key_raw)
            if not tracks_raw:
                tracks_raw = asyncio.run(_search_lastfm_tracks_async(query, limit=LASTFM_BATCH_LIMIT))
                cache.set(cache_key_raw, tracks_raw, timeout=CACHE_TIMEOUT)

            if not tracks_raw:
                return Response({'results': []}, status=200)

            paginator = self.pagination_class()
            page = paginator.paginate_queryset(tracks_raw, request)

            enriched_page = asyncio.run(_enrich_tracks_list_async(page))

            return paginator.get_paginated_response(enriched_page)

        except Exception as e:
            logger.error(f"Search error: {e}", exc_info=True)
            return Response({'error': 'Internal server error'}, status=500)

    def paginate_queryset(self, queryset):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, self.request)
        return paginator.get_paginated_response(page)