import requests
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from .serializers import TrackSerializer, TrendingSerializer

LASTFM_KEY = '49b6213396a4b5a21637bcf627a4bf3d'

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
            if (item.get('trackName', '').lower() == track_name.lower() and
                item.get('artistName', '').lower() == artist_name.lower()):
                cover = item['artworkUrl100'].replace('100x100bb', '600x600bb')
                preview = item.get('previewUrl')
                return {'cover': cover, 'preview': preview}
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
            return alb.get('cover_xl') or alb.get('cover_big') or alb.get('cover_medium') or None
        return None
    except Exception:
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
        return None
    except Exception:
        return None

class YearChartAPIView(APIView):
    def get(self, request):
        try:
            lastfm_tracks = self._get_live_chart(15)
            tracks = self._enrich_live_tracks(lastfm_tracks)
            return Response({'tracks': tracks}, status=status.HTTP_200_OK)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e), 'trace': traceback.format_exc()},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

    def _get_live_chart(self, limit=15):
        url = 'http://ws.audioscrobbler.com/2.0/'
        params = {
            'method': 'chart.gettoptracks',
            'api_key': LASTFM_KEY,
            'format': 'json',
            'limit': limit
        }
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        return resp.json()['tracks']['track']

    def _enrich_live_tracks(self, tracks):
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
                'listeners': int(tr.get('listeners', 0)),
                'url': preview or tr['url'],
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
            return Response({"error": "Query parameter 'q' is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            lastfm_tracks = self._get_lastfm_tracks(query)
            if not lastfm_tracks:
                return Response([], status=status.HTTP_200_OK)

            enriched_tracks = []
            for track in lastfm_tracks:
                cover_url = _get_deezer_cover(track['name'], track['artist'])
                preview_url = _get_deezer_preview(track['name'], track['artist'])
                enriched_tracks.append({
                    'name': track['name'],
                    'artist': track['artist'],
                    'listeners': track['listeners'],
                    'url': preview_url or track['url'],
                    'image_url': cover_url or '/static/images/default.svg',
                    'mbid': track.get('mbid', '')
                })

            serializer = TrackSerializer(data=enriched_tracks, many=True)
            if serializer.is_valid():
                return self.paginate_queryset(serializer.data)
            return Response(enriched_tracks, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    def paginate_queryset(self, queryset):
        paginator = self.pagination_class()
        result_page = paginator.paginate_queryset(queryset, self.request)
        return paginator.get_paginated_response(result_page)

    def _get_lastfm_tracks(self, query):
        try:
            response = requests.get(
                'http://ws.audioscrobbler.com/2.0/',
                params={
                    'method': 'track.search',
                    'track': query,
                    'api_key': LASTFM_KEY,
                    'format': 'json',
                    'limit': 100
                }
            )
            data = response.json()
            return data.get('results', {}).get('trackmatches', {}).get('track', [])
        except:
            return None

def _get_lastfm_chart(limit=20):
    url = 'http://ws.audioscrobbler.com/2.0/'
    params = {
        'method': 'chart.gettopartists',
        'api_key': LASTFM_KEY,
        'format': 'json',
        'limit': limit
    }
    resp = requests.get(url, params=params, timeout=5)
    resp.raise_for_status()
    return resp.json()['artists']['artist']


def _get_deezer_artist_info(name):
    url = 'https://api.deezer.com/search/artist'
    params = {'q': name, 'limit': 1}
    r = requests.get(url, params=params, timeout=3)
    if r.status_code != 200:
        return None
    data = r.json()
    if not data.get('data'):
        return None
    art = data['data'][0]
    return art.get('picture_xl') or art.get('picture_big') or art.get('picture_medium')


def _lastfm_artist_releases(mbid, name):
    url = 'http://ws.audioscrobbler.com/2.0/'
    params = {
        'method': 'artist.gettopalbums',
        'artist': name,
        'mbid': mbid,
        'api_key': LASTFM_KEY,
        'format': 'json',
        'limit': 3
    }
    try:
        r = requests.get(url, params=params, timeout=4)
        r.raise_for_status()
        albums = r.json()['topalbums']['album']
        return [{'title': a['name'],
                 'playcount': a.get('playcount', 0),
                 'url': a['url'],
                 'cover': a['image'][-1]['#text'] or '/static/images/default.svg'} for a in albums]
    except:
        return []


class TrendingArtistsAPIView(APIView):
    def get(self, request):
        try:
            lastfm_artists = _get_lastfm_chart(10)
            artists = []
            for art in lastfm_artists:
                name = art['name']
                mbid = art.get('mbid', '')
                photo = _get_deezer_artist_info(name)
                releases = _lastfm_artist_releases(mbid, name)
                artists.append({
                    'name': name,
                    'photo_url': photo or '/static/images/default.svg',
                    'releases': releases
                })
            return Response({'artists': artists}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


def index(request):
    return render(request, 'index.html')