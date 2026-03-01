import logging

from asgiref.sync import async_to_sync, sync_to_async
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .tracks_async import _enrich_tracks_list_async
from ..models import Playlist, PlaylistLike

logger = logging.getLogger(__name__)
User = get_user_model()


@sync_to_async
def _get_or_create_favorites(user):
    playlist = Playlist.objects.filter(user=user).order_by("created_at").first()
    if playlist is None:
        playlist = Playlist.objects.create(user=user, title="Favorites", tracks=[])
    return playlist


@sync_to_async
def _update_favorites_title(user, title):
    playlist = Playlist.objects.filter(user=user).order_by("created_at").first()
    if playlist is None:
        playlist = Playlist.objects.create(user=user, title="Favorites", tracks=[])
    playlist.title = title
    playlist.save(update_fields=["title"])
    return playlist


def _normalize_track_for_storage(track):
    """Возвращает dict для хранения в плейлисте с опциональным mbid."""
    stored = {"name": track["name"], "artist": track["artist"]}
    mbid = track.get("mbid")
    if mbid and str(mbid).strip():
        stored["mbid"] = str(mbid).strip()
    return stored


@sync_to_async
def _add_track_to_favorites(user, track):
    with transaction.atomic():
        playlist = (
            Playlist.objects.select_for_update()
            .filter(user=user)
            .order_by("created_at")
            .first()
        )
        if playlist is None:
            playlist = Playlist.objects.create(user=user, title="Favorites", tracks=[])
        tracks = playlist.tracks or []

        new_mbid = track.get("mbid")
        if new_mbid:
            new_mbid = str(new_mbid).strip()

        for item in tracks:
            if not isinstance(item, dict):
                continue
            if new_mbid:
                existing_mbid = item.get("mbid")
                if existing_mbid and str(existing_mbid).strip() == new_mbid:
                    return playlist, False
            name_key = (
                str(item.get("name", "")).strip().lower(),
                str(item.get("artist", "")).strip().lower(),
            )
            track_key = (
                track["name"].strip().lower(),
                track["artist"].strip().lower(),
            )
            if name_key == track_key:
                return playlist, False

        tracks.append(_normalize_track_for_storage(track))
        playlist.tracks = tracks
        playlist.save(update_fields=["tracks"])
        return playlist, True


@sync_to_async
def _remove_track_from_favorites(user, track):
    with transaction.atomic():
        playlist = (
            Playlist.objects.select_for_update()
            .filter(user=user)
            .order_by("created_at")
            .first()
        )
        if playlist is None:
            playlist = Playlist.objects.create(user=user, title="Favorites", tracks=[])
        tracks = playlist.tracks or []

        updated_tracks = []
        removed = False
        track_mbid = track.get("mbid")
        if track_mbid:
            track_mbid = str(track_mbid).strip()
        track_name_key = track["name"].strip().lower()
        track_artist_key = track["artist"].strip().lower()

        for item in tracks:
            if not isinstance(item, dict):
                updated_tracks.append(item)
                continue
            if track_mbid:
                item_mbid = item.get("mbid")
                if item_mbid and str(item_mbid).strip() == track_mbid:
                    removed = True
                    continue
            item_name = str(item.get("name", "")).strip().lower()
            item_artist = str(item.get("artist", "")).strip().lower()
            if item_name == track_name_key and item_artist == track_artist_key:
                removed = True
            else:
                updated_tracks.append(item)

        if removed:
            playlist.tracks = updated_tracks
            playlist.save(update_fields=["tracks"])

        return playlist, removed


class PlaylistMeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            return async_to_sync(self._get_playlist_async)(request)
        except Exception:
            logger.error("Failed to load playlist", exc_info=True)
            return Response(
                {"detail": "Failed to load playlist."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def _get_playlist_async(self, request):
        playlist = await _get_or_create_favorites(request.user)
        tracks = playlist.tracks or []
        enriched = await _enrich_tracks_list_async(tracks)
        return Response(
            {"title": playlist.title, "tracks": enriched},
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        title = str(request.data.get("title", "")).strip()
        if not title:
            return Response(
                {"detail": "Title is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        if len(title) > 255:
            return Response(
                {"detail": "Title is too long."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            playlist = async_to_sync(_update_favorites_title)(request.user, title)
        except Exception:
            logger.error("Failed to update playlist title", exc_info=True)
            return Response(
                {"detail": "Failed to update playlist title."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": "Title updated.", "title": playlist.title},
            status=status.HTTP_200_OK,
        )


class PlaylistTrackAddAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _validate_track_payload(request):
        name = str(request.data.get("name", "")).strip()
        artist = str(request.data.get("artist", "")).strip()
        if not name or not artist:
            return None, Response(
                {"detail": "Both name and artist are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        track = {"name": name, "artist": artist}
        mbid = str(request.data.get("mbid", "")).strip()
        if mbid:
            track["mbid"] = mbid
        return track, None

    def post(self, request):
        track, error_response = self._validate_track_payload(request)
        if error_response:
            return error_response

        try:
            return async_to_sync(self._add_track_async)(request, track)
        except Exception:
            logger.error("Failed to add track to playlist", exc_info=True)
            return Response(
                {"detail": "Failed to add track."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def _add_track_async(self, request, track):
        playlist, added = await _add_track_to_favorites(request.user, track)

        if not added:
            return Response(
                {
                    "detail": "Track already exists.",
                    "track": track,
                    "title": playlist.title,
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"detail": "Track added.", "track": track, "title": playlist.title},
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request):
        track, error_response = self._validate_track_payload(request)
        if error_response:
            return error_response

        try:
            return async_to_sync(self._delete_track_async)(request, track)
        except Exception:
            logger.error("Failed to remove track from playlist", exc_info=True)
            return Response(
                {"detail": "Failed to remove track."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def _delete_track_async(self, request, track):
        playlist, removed = await _remove_track_from_favorites(request.user, track)

        if not removed:
            return Response(
                {"detail": "Track not found.", "track": track, "title": playlist.title},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"detail": "Track removed.", "track": track, "title": playlist.title},
            status=status.HTTP_200_OK,
        )


@sync_to_async
def _get_public_favorites_by_username(username):
    user = (
        User.objects.filter(username__iexact=username)
        .only("id", "username", "avatar", "bio", "is_public_favorites")
        .first()
    )
    if not user or not user.is_public_favorites:
        return None, None

    playlist = Playlist.objects.filter(user=user).order_by("created_at").first()
    if playlist is None:
        playlist = Playlist.objects.create(user=user, title="Favorites", tracks=[])
    return user, playlist


@sync_to_async
def _playlist_likes_data(playlist, current_user):
    likes_count = PlaylistLike.objects.filter(playlist=playlist).count()
    liked_by_me = False
    if current_user and current_user.is_authenticated:
        liked_by_me = PlaylistLike.objects.filter(
            playlist=playlist, user=current_user
        ).exists()
    return likes_count, liked_by_me


@sync_to_async
def _toggle_public_like(username, acting_user, should_like):
    if not acting_user or not acting_user.is_authenticated:
        return None, None, "unauthorized"

    user = (
        User.objects.filter(username__iexact=username)
        .only("id", "is_public_favorites")
        .first()
    )
    if not user or not user.is_public_favorites:
        return None, None, "not_found"

    playlist = Playlist.objects.filter(user=user).order_by("created_at").first()
    if playlist is None:
        playlist = Playlist.objects.create(user=user, title="Favorites", tracks=[])

    if playlist.user_id == acting_user.id:
        return playlist, None, "self_like_forbidden"

    if should_like:
        PlaylistLike.objects.get_or_create(playlist=playlist, user=acting_user)
    else:
        PlaylistLike.objects.filter(playlist=playlist, user=acting_user).delete()

    likes_count = PlaylistLike.objects.filter(playlist=playlist).count()
    liked_by_me = PlaylistLike.objects.filter(
        playlist=playlist, user=acting_user
    ).exists()
    return playlist, {"likes_count": likes_count, "liked_by_me": liked_by_me}, None


@sync_to_async
def _get_public_playlists_top(limit=8):
    playlists = (
        Playlist.objects.filter(user__is_public_favorites=True)
        .select_related("user")
        .annotate(likes_count=Count("likes"))
        .order_by("-likes_count", "-created_at")[:limit]
    )

    rows = []
    for playlist in playlists:
        tracks = playlist.tracks if isinstance(playlist.tracks, list) else []
        rows.append(
            {
                "username": playlist.user.username,
                "avatar_url": (
                    playlist.user.avatar.url
                    if getattr(playlist.user, "avatar", None)
                    else None
                ),
                "playlist_title": playlist.title,
                "likes_count": getattr(playlist, "likes_count", 0),
                "tracks_count": len(tracks),
            }
        )
    return rows


class PublicFavoritesAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, username):
        try:
            return async_to_sync(self._get_public_favorites_async)(request, username)
        except Exception:
            logger.error("Failed to load public favorites", exc_info=True)
            return Response(
                {"detail": "Failed to load public favorites."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def _get_public_favorites_async(self, request, username):
        user, playlist = await _get_public_favorites_by_username(username)
        if not user or not playlist:
            return Response(
                {"detail": "Public playlist not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        tracks = playlist.tracks if isinstance(playlist.tracks, list) else []
        enriched = await _enrich_tracks_list_async(tracks)
        likes_count, liked_by_me = await _playlist_likes_data(playlist, request.user)

        return Response(
            {
                "owner": {
                    "username": user.username,
                    "avatar_url": user.avatar.url if user.avatar else None,
                    "bio": user.bio,
                },
                "playlist": {
                    "title": playlist.title,
                    "likes_count": likes_count,
                    "liked_by_me": liked_by_me,
                    "tracks": enriched,
                },
            },
            status=status.HTTP_200_OK,
        )


class PublicFavoritesLikeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, username):
        return self._handle(request, username, should_like=True)

    def delete(self, request, username):
        return self._handle(request, username, should_like=False)

    def _handle(self, request, username, should_like):
        try:
            playlist, data, error = async_to_sync(_toggle_public_like)(
                username, request.user, should_like
            )
        except Exception:
            logger.error("Failed to toggle public playlist like", exc_info=True)
            return Response(
                {"detail": "Failed to toggle like."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if error == "unauthorized":
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if error == "not_found":
            return Response(
                {"detail": "Public playlist not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if error == "self_like_forbidden":
            return Response(
                {"detail": "You cannot like your own public playlist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail": "Liked." if should_like else "Unliked.",
                "likes_count": data["likes_count"],
                "liked_by_me": data["liked_by_me"],
                "title": playlist.title if playlist else "Favorites",
            },
            status=status.HTTP_200_OK,
        )


class PublicFavoritesTrendingAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        limit_str = request.query_params.get("limit", "8")
        try:
            limit = int(limit_str)
            if limit < 1 or limit > 30:
                raise ValueError()
        except ValueError:
            return Response(
                {"detail": "Limit must be 1-30."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            rows = async_to_sync(_get_public_playlists_top)(limit)
        except Exception:
            logger.error("Failed to load public favorites trending", exc_info=True)
            return Response(
                {"detail": "Failed to load trending public playlists."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"results": rows, "meta": {"count": len(rows), "limit": limit}},
            status=status.HTTP_200_OK,
        )
