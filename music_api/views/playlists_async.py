import logging

from asgiref.sync import async_to_sync, sync_to_async
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .tracks_async import _enrich_tracks_list_async
from ..models import Playlist

logger = logging.getLogger(__name__)


@sync_to_async
def _get_or_create_favorites(user):
    playlist, _ = Playlist.objects.get_or_create(
        user=user,
        title='Favorites',
        defaults={'tracks': []},
    )
    return playlist


@sync_to_async
def _add_track_to_favorites(user, track):
    with transaction.atomic():
        playlist, _ = Playlist.objects.select_for_update().get_or_create(
            user=user,
            title='Favorites',
            defaults={'tracks': []},
        )
        tracks = playlist.tracks or []
        normalized = {
            (
                str(item.get('name', '')).strip().lower(),
                str(item.get('artist', '')).strip().lower(),
            )
            for item in tracks
            if isinstance(item, dict)
        }
        key = (track['name'].strip().lower(), track['artist'].strip().lower())
        if key in normalized:
            return playlist, False

        tracks.append({'name': track['name'], 'artist': track['artist']})
        playlist.tracks = tracks
        playlist.save(update_fields=['tracks'])
        return playlist, True


@sync_to_async
def _remove_track_from_favorites(user, track):
    with transaction.atomic():
        playlist, _ = Playlist.objects.select_for_update().get_or_create(
            user=user,
            title='Favorites',
            defaults={'tracks': []},
        )
        tracks = playlist.tracks or []

        updated_tracks = []
        removed = False
        
        for item in tracks:
            if isinstance(item, dict):
                item_name = str(item.get('name', '')).strip().lower()
                item_artist = str(item.get('artist', '')).strip().lower()
                track_name = track['name'].strip().lower()
                track_artist = track['artist'].strip().lower()
                
                if item_name == track_name and item_artist == track_artist:
                    removed = True
                else:
                    updated_tracks.append(item)
        
        if removed:
            playlist.tracks = updated_tracks
            playlist.save(update_fields=['tracks'])
        
        return playlist, removed


class PlaylistMeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            return async_to_sync(self._get_playlist_async)(request)
        except Exception:
            logger.error('Failed to load playlist', exc_info=True)
            return Response({'detail': 'Failed to load playlist.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def _get_playlist_async(self, request):
        playlist = await _get_or_create_favorites(request.user)
        tracks = playlist.tracks or []
        enriched = await _enrich_tracks_list_async(tracks)
        return Response(
            {'title': playlist.title, 'tracks': enriched},
            status=status.HTTP_200_OK,
        )


class PlaylistTrackAddAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _validate_track_payload(request):
        name = str(request.data.get('name', '')).strip()
        artist = str(request.data.get('artist', '')).strip()
        if not name or not artist:
            return None, Response(
                {'detail': 'Both name and artist are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return {'name': name, 'artist': artist}, None

    def post(self, request):
        track, error_response = self._validate_track_payload(request)
        if error_response:
            return error_response

        try:
            return async_to_sync(self._add_track_async)(request, track)
        except Exception:
            logger.error('Failed to add track to playlist', exc_info=True)
            return Response({'detail': 'Failed to add track.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def _add_track_async(self, request, track):
        playlist, added = await _add_track_to_favorites(request.user, track)

        if not added:
            return Response(
                {'detail': 'Track already exists.', 'track': track, 'title': playlist.title},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {'detail': 'Track added.', 'track': track, 'title': playlist.title},
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request):
        track, error_response = self._validate_track_payload(request)
        if error_response:
            return error_response

        try:
            return async_to_sync(self._delete_track_async)(request, track)
        except Exception:
            logger.error('Failed to remove track from playlist', exc_info=True)
            return Response({'detail': 'Failed to remove track.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def _delete_track_async(self, request, track):
        playlist, removed = await _remove_track_from_favorites(request.user, track)

        if not removed:
            return Response(
                {'detail': 'Track not found.', 'track': track, 'title': playlist.title},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {'detail': 'Track removed.', 'track': track, 'title': playlist.title},
            status=status.HTTP_200_OK,
        )
