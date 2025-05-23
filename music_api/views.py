from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests
from django.shortcuts import render
from .serializers import TrackSerializer
from rest_framework.pagination import PageNumberPagination

def index(request):
    return render(request, 'index.html')

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
            lastfm_tracks = self._get_lastfm_tracks(query)
            if not lastfm_tracks:
                return Response([], status=status.HTTP_200_OK)

            enriched_tracks = []
            for track in lastfm_tracks:
                cover_url = self._get_deezer_cover(
                    track['name'],
                    track['artist']
                )

                enriched_track = {
                    'name': track['name'],
                    'artist': track['artist'],
                    'listeners': track['listeners'],
                    'url': track['url'],
                    'image_url': cover_url or '/static/images/default.svg',
                    'mbid': track.get('mbid', '')
                }
                enriched_tracks.append(enriched_track)

            serializer = TrackSerializer(data=enriched_tracks, many=True)
            if serializer.is_valid():
                return self.paginate_queryset(serializer.data)
            return Response(enriched_tracks, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

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
                    'api_key': '49b6213396a4b5a21637bcf627a4bf3d',
                    'format': 'json',
                    'limit': 100
                }
            )
            data = response.json()
            return data.get('results', {}).get('trackmatches', {}).get('track', [])
        except:
            return None

    def _get_deezer_cover(self, track_name, artist_name):
        try:
            response = requests.get(
                'https://api.deezer.com/search',
                params={
                    'q': f'artist:"{artist_name}" track:"{track_name}"',
                    'limit': 1
                },
                timeout=2
            )
            data = response.json()

            if data.get('data'):
                return data['data'][0]['album']['cover_xl'] or \
                    data['data'][0]['album']['cover_big'] or \
                    data['data'][0]['album']['cover_medium']
            return None
        except:
            return None