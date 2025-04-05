from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests
from django.shortcuts import render

def index(request):
    return render(request, 'index.html')


class TrackSearchAPIView(APIView):
    def get(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response(
                {"error": "Query parameter 'q' is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        api_key = '49b6213396a4b5a21637bcf627a4bf3d'
        url = f'http://ws.audioscrobbler.com/2.0/?method=track.search&track={query}&api_key={api_key}&format=json'

        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()

            formatted_tracks = []
            for track in data.get('results', {}).get('trackmatches', {}).get('track', []):
                formatted_tracks.append({
                    'name': track.get('name', 'Unknown Track'),
                    'artist': track.get('artist', 'Unknown Artist'),
                    'listeners': track.get('listeners', '0'),
                    'url': track.get('url', '#')
                })

            return Response(formatted_tracks, status=status.HTTP_200_OK)

        except requests.exceptions.RequestException as e:
            return Response(
                {"error": "Не удалось получить данные с Last.fm"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )