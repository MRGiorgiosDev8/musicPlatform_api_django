import logging

from asgiref.sync import async_to_sync
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from .services_async import _get_wikipedia_artist_bios_batch_async

logger = logging.getLogger(__name__)


class WikipediaArtistBatchAPIView(APIView):
    """Отдельный API для batch-получения bio/фото артистов из Wikipedia."""

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    authentication_classes = []

    def post(self, request):
        artists = request.data.get("artists")
        lang = str(request.data.get("lang", "ru")).strip().lower() or "ru"

        if not isinstance(artists, list):
            return Response(
                {"error": "artists must be an array of artist names"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(artists) > 30:
            return Response(
                {"error": "artists length must be <= 30"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not lang.isalpha() or len(lang) > 5:
            return Response(
                {"error": "lang is invalid"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            artists_normalized = [
                str(name).strip() for name in artists if str(name).strip()
            ]
            bios = async_to_sync(_get_wikipedia_artist_bios_batch_async)(
                artists_normalized, lang
            )
            return Response(
                {
                    "artists": bios,
                    "meta": {
                        "lang_requested": lang,
                        "count": len(bios),
                    },
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.error("WikipediaArtistBatchAPIView error: %s", e, exc_info=True)
            return Response(
                {"error": "Failed to fetch Wikipedia artist data", "artists": {}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
