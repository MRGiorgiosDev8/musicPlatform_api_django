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
from asgiref.sync import async_to_sync

# Асинхронные сервисные функции
from .services_async import (
    _get_lastfm_tracks_chart_async,
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
        if not isinstance(tr, dict):
            continue

        name = tr.get('name')
        artist_field = tr.get('artist')
        if not name or artist_field is None:
            continue

        artist_name = artist_field.get('name') if isinstance(artist_field, dict) else artist_field
        if not artist_name:
            continue

        tracks_for_batch.append({
            'name': name,
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
        if not isinstance(tr, dict):
            continue

        name = tr.get('name')
        artist_field = tr.get('artist')
        if not name or artist_field is None:
            continue

        artist = artist_field.get('name') if isinstance(artist_field, dict) else artist_field
        if not artist:
            continue
        track_key = (name, artist)

        lastfm_cover = None
        try:
            images = tr.get('image')
            if isinstance(images, list) and images:
                lastfm_cover = images[-1].get('#text') or None
        except Exception:
            lastfm_cover = None

        it_res = itunes_data.get(track_key, {})
        dz_res = deezer_data.get(track_key, {})

        cover = it_res.get('cover') or dz_res.get('cover') or lastfm_cover
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

    async def _get_chart_data_async(self, genre, limit):
        """Асинхронное получение данных чарта"""
        try:
            if genre:
                raw = await _get_lastfm_tracks_by_genre_async(genre, limit)
            else:
                raw = await _get_lastfm_tracks_chart_async(limit)

            if not raw:
                return []

            enriched = await _enrich_tracks_list_async(raw)
            
            # Сортируем по количеству прослушиваний (сначала listeners, потом playcount)
            enriched.sort(key=lambda track: (track['listeners'], track['playcount']), reverse=True)
            
            return enriched

        except Exception as e:
            logger.error(f"Chart data fetch error: {e}", exc_info=True)
            return []

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
            enriched = async_to_sync(self._get_chart_data_async)(genre, limit)

            if enriched:
                cache.set(cache_key, enriched, timeout=CACHE_TIMEOUT)
                return Response({'tracks': enriched, 'meta': {'cached': False}}, status=200)
            else:
                return Response({'tracks': [], 'meta': {'cached': False, 'error': 'No data available'}}, status=200)

        except Exception as e:
            logger.error(f"Chart API error: {e}", exc_info=True)
            return Response({'error': 'Server error', 'tracks': []}, status=500)


class TrackSearchAPIView(APIView):
    """API для поиска треков с пагинацией перед обогащением"""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    pagination_class = TrackPagination

    async def _search_and_enrich_async(self, query, page):
        """Асинхронный поиск и обогащение треков"""
        try:
            enriched_page = await _enrich_tracks_list_async(page)
            return enriched_page
        except Exception as e:
            logger.error(f"Search enrich error: {e}", exc_info=True)
            return []

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'Query required'}, status=400)

        try:
            cache_key_raw = f"search_raw:{query}"
            tracks_raw = cache.get(cache_key_raw)
            if not tracks_raw:
                tracks_raw = async_to_sync(_search_lastfm_tracks_async)(query, limit=LASTFM_BATCH_LIMIT)
                
                cache.set(cache_key_raw, tracks_raw, timeout=CACHE_TIMEOUT)

            if not tracks_raw:
                return Response({'results': []}, status=200)

            paginator = self.pagination_class()
            page = paginator.paginate_queryset(tracks_raw, request)

            enriched_page = async_to_sync(self._search_and_enrich_async)(query, page)

            return paginator.get_paginated_response(enriched_page)

        except Exception as e:
            logger.error(f"Search error: {e}", exc_info=True)
            return Response({'error': 'Internal server error', 'results': []}, status=500)

    def paginate_queryset(self, queryset):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, self.request)
        return paginator.get_paginated_response(page)
