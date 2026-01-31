import requests
import traceback
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.core.cache import cache

from .base import logger, LASTFM_KEY
from .services import _get_itunes, _get_deezer_data


class TrackPagination(PageNumberPagination):
    page_size = 14
    page_size_query_param = 'page_size'
    max_page_size = 30


class YearChartAPIView(APIView):
    """Чарт треков (общий или по жанру)"""

    def get(self, request):
        genre = request.query_params.get('genre')
        limit = 15

        cache_key = f"year_chart:{genre or 'all'}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached, status=status.HTTP_200_OK)

        try:
            if genre:
                tracks = self._get_by_genre_with_listeners(genre, limit)
            else:
                tracks = self._get_live_chart(limit)

            enriched = self._enrich_tracks(tracks)
            data = {'tracks': enriched}
            cache.set(cache_key, data, timeout=60 * 10)

            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            traceback.print_exc()
            return Response(
                {'error': str(e), 'trace': traceback.format_exc()},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    def _get_live_chart(self, limit):
        r = requests.get(
            'https://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'chart.gettoptracks',
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': limit
            },
            timeout=5
        )
        r.raise_for_status()
        return r.json()['tracks']['track']

    def _get_by_genre_with_listeners(self, genre, limit):
        r = requests.get(
            'https://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'tag.gettoptracks',
                'tag': genre,
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': limit
            },
            timeout=5
        )
        r.raise_for_status()
        return r.json()['tracks']['track']

    def _enrich_tracks(self, tracks):
        enriched = []
        for tr in tracks:
            name = tr['name']
            artist = tr['artist']['name']

            itunes = _get_itunes(name, artist)
            deezer = _get_deezer_data(name, artist)
            cover = itunes['cover'] or deezer['cover']
            preview = itunes['preview'] or deezer['preview']

            enriched.append({
                'name': name,
                'artist': artist,
                'listeners': tr.get('listeners', '0'),
                'url': preview or tr.get('url'),
                'image_url': cover or '/static/images/default.svg'
            })
        return enriched


class TrackSearchAPIView(APIView):
    """Поиск треков с пагинацией"""
    pagination_class = TrackPagination

    def get(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response(
                {"error": "Query parameter 'q' is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            tracks = self._get_lastfm_tracks(query)
            if not tracks:
                return Response([], status=status.HTTP_200_OK)

            enriched = []
            for tr in tracks:
                itunes = _get_itunes(tr['name'], tr['artist'])
                deezer = _get_deezer_data(tr['name'], tr['artist'])

                cover = itunes['cover'] or deezer['cover']
                preview = itunes['preview'] or deezer['preview']
                enriched.append({
                    'name': tr['name'],
                    'artist': tr['artist'],
                    'listeners': tr['listeners'],
                    'url': preview or tr['url'],
                    'image_url': cover or '/static/images/default.svg',
                    'mbid': tr.get('mbid', '')
                })

            return self.paginate_queryset(enriched)

        except Exception as e:
            return Response(
                {'error': str(e), 'trace': traceback.format_exc()},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    def paginate_queryset(self, queryset):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, self.request)
        return paginator.get_paginated_response(page)

    def _get_lastfm_tracks(self, query):
        r = requests.get(
            'https://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'track.search',
                'track': query,
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': 100
            }
        )
        return r.json().get('results', {}).get('trackmatches', {}).get('track', [])