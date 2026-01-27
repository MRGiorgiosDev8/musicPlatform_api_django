import requests
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from .serializers import TrackSerializer
from decouple import config

LASTFM_KEY = config("LASTFM_KEY")

def _get_itunes(track_name: str, artist_name: str, timeout: int = 3):
    try:
        r = requests.get(
            'https://itunes.apple.com/search',
            params={
                'term': track_name,
                'media': 'music',
                'entity': 'song',
                'attribute': 'songTerm',
                'limit': 5
            },
            timeout=timeout
        )
        r.raise_for_status()
        data = r.json()

        for item in data.get('results', []):
            if (
                item.get('trackName', '').lower() == track_name.lower()
                and item.get('artistName', '').lower() == artist_name.lower()
            ):
                return {
                    'cover': item['artworkUrl100'].replace('100x100bb', '600x600bb'),
                    'preview': item.get('previewUrl')
                }
        return {'cover': None, 'preview': None}
    except Exception:
        return {'cover': None, 'preview': None}

def _get_deezer_cover(track_name, artist_name):
    try:
        r = requests.get(
            'https://api.deezer.com/search',
            params={'q': f'artist:"{artist_name}" track:"{track_name}"', 'limit': 1},
            timeout=2
        )
        data = r.json()
        if data.get('data'):
            alb = data['data'][0]['album']
            return alb.get('cover_xl') or alb.get('cover_big') or alb.get('cover_medium')
    except Exception:
        pass
    return None


def _get_deezer_preview(track_name, artist_name):
    try:
        r = requests.get(
            'https://api.deezer.com/search',
            params={'q': f'artist:"{artist_name}" track:"{track_name}"', 'limit': 1},
            timeout=3
        )
        data = r.json()
        if data.get('data'):
            return data['data'][0].get('preview')
    except Exception:
        pass
    return None


class YearChartAPIView(APIView):
    def get(self, request):
        genre = request.query_params.get('genre')
        limit = 15

        try:
            if genre:
                tracks = self._get_by_genre_with_listeners(genre, limit)
            else:
                tracks = self._get_live_chart(limit)

            enriched = self._enrich_tracks(tracks)
            return Response({'tracks': enriched}, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e), 'trace': traceback.format_exc()},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    def _get_live_chart(self, limit):
        r = requests.get(
            'http://ws.audioscrobbler.com/2.0/',
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
            'http://ws.audioscrobbler.com/2.0/',
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
            cover = itunes['cover'] or _get_deezer_cover(name, artist)
            preview = itunes['preview'] or _get_deezer_preview(name, artist)

            enriched.append({
                'name': name,
                'artist': artist,
                'listeners': tr.get('listeners', '0'),  # строка
                'url': preview or tr.get('url'),
                'image_url': cover or '/static/images/default.svg'
            })

        return enriched


class TrackPagination(PageNumberPagination):
    page_size = 14
    page_size_query_param = 'page_size'
    max_page_size = 30


class TrackSearchAPIView(APIView):
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
                cover = _get_deezer_cover(tr['name'], tr['artist'])
                preview = _get_deezer_preview(tr['name'], tr['artist'])
                enriched.append({
                    'name': tr['name'],
                    'artist': tr['artist'],
                    'listeners': tr['listeners'],
                    'url': preview or tr['url'],
                    'image_url': cover or '/static/images/default.svg',
                    'mbid': tr.get('mbid', '')
                })

            serializer = TrackSerializer(data=enriched, many=True)
            serializer.is_valid(raise_exception=True)
            return self.paginate_queryset(serializer.data)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    def paginate_queryset(self, queryset):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, self.request)
        return paginator.get_paginated_response(page)

    def _get_lastfm_tracks(self, query):
        r = requests.get(
            'http://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'track.search',
                'track': query,
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': 100
            }
        )
        return r.json().get('results', {}).get('trackmatches', {}).get('track', [])


def _get_lastfm_artists_by_genre(genre, limit=30):
    r = requests.get(
        'http://ws.audioscrobbler.com/2.0/',
        params={
            'method': 'tag.gettopartists',
            'tag': genre,
            'api_key': LASTFM_KEY,
            'format': 'json',
            'limit': limit * 2
        },
        timeout=5
    )
    r.raise_for_status()

    artists = r.json()['topartists']['artist']

    for a in artists:
        a['listeners'] = int(a.get('listeners', 0))
        a['playcount'] = int(a.get('playcount', 0))

    artists.sort(
        key=lambda a: (a['listeners'], a['playcount']),
        reverse=True
    )

    return artists[:limit]


def _get_lastfm_chart(limit=30):
    r = requests.get(
        'http://ws.audioscrobbler.com/2.0/',
        params={
            'method': 'chart.gettopartists',
            'api_key': LASTFM_KEY,
            'format': 'json',
            'limit': limit
        },
        timeout=5
    )
    r.raise_for_status()
    return r.json()['artists']['artist']


def _get_deezer_artist_info(name):
    r = requests.get(
        'https://api.deezer.com/search/artist',
        params={'q': name, 'limit': 1},
        timeout=3
    )
    data = r.json()
    if data.get('data'):
        art = data['data'][0]
        return art.get('picture_xl') or art.get('picture_big')
    return None


def _lastfm_artist_releases(mbid, name):
    try:
        r = requests.get(
            'http://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'artist.gettopalbums',
                'artist': name,
                'mbid': mbid,
                'api_key': LASTFM_KEY,
                'format': 'json',
                'limit': 3
            },
            timeout=4
        )
        r.raise_for_status()
        albums = r.json()['topalbums']['album']
        return [
            {
                'title': a['name'],
                'playcount': a.get('playcount', 0),
                'url': a['url'],
                'cover': a['image'][-1]['#text'] or '/static/images/default.svg'
            }
            for a in albums
        ]
    except Exception:
        return []


class TrendingArtistsAPIView(APIView):
    def get(self, request):
        genre = request.query_params.get('genre')

        try:
            if genre:
                artists_raw = _get_lastfm_artists_by_genre(genre, 16)
            else:
                artists_raw = _get_lastfm_chart(16)

            artists = []
            for art in artists_raw:
                name = art['name']
                artists.append({
                    'name': name,
                    'photo_url': _get_deezer_artist_info(name) or '/static/images/default.svg',
                    'listeners': art.get('listeners', 0),
                    'playcount': art.get('playcount', 0),
                    'releases': _lastfm_artist_releases(art.get('mbid', ''), name)
                })

            return Response({'artists': artists}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


def index(request):
    return render(request, 'index.html')