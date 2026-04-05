import logging

from asgiref.sync import async_to_sync, sync_to_async
from django.contrib.auth import get_user_model
from django.db.models import Count, F, Func, IntegerField
from django.db import transaction, connection
from django.urls import reverse
from django.utils.timezone import localtime
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .tracks_async import _enrich_tracks_list_async
from ..models import Playlist, PlaylistComment, PlaylistCommentLike, PlaylistLike
from ..ws import send_public_playlist_comment_event

logger = logging.getLogger(__name__)
User = get_user_model()
COMMENT_MAX_LENGTH = 1000


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


def _normalize_text(value):
    """Нормализует текст для сравнения: trim, collapse spaces, lower, NFKD."""
    raw = str(value or "")
    collapsed = " ".join(raw.split())
    try:
        import unicodedata

        normalized = unicodedata.normalize("NFKD", collapsed)
        normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    except Exception:
        normalized = collapsed
    return normalized.lower()


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
                _normalize_text(item.get("name", "")),
                _normalize_text(item.get("artist", "")),
            )
            track_key = (
                _normalize_text(track["name"]),
                _normalize_text(track["artist"]),
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
        track_name_key = _normalize_text(track["name"])
        track_artist_key = _normalize_text(track["artist"])

        for item in tracks:
            if not isinstance(item, dict):
                updated_tracks.append(item)
                continue
            if track_mbid:
                item_mbid = item.get("mbid")
                if item_mbid and str(item_mbid).strip() == track_mbid:
                    removed = True
                    continue
            item_name = _normalize_text(item.get("name", ""))
            item_artist = _normalize_text(item.get("artist", ""))
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
    json_length_fn = None
    if connection.vendor == "postgresql":
        json_length_fn = "jsonb_array_length"
    elif connection.vendor == "sqlite":
        json_length_fn = "json_array_length"

    base_qs = (
        Playlist.objects.filter(user__is_public_favorites=True)
        .select_related("user")
        .annotate(likes_count=Count("likes"))
    )
    if json_length_fn:
        base_qs = base_qs.annotate(
            tracks_count=Func(
                F("tracks"),
                function=json_length_fn,
                output_field=IntegerField(),
            )
        )

    playlists = base_qs.order_by("-likes_count", "-created_at")[:limit]

    rows = []
    for playlist in playlists:
        tracks_count = getattr(playlist, "tracks_count", None)
        if tracks_count is None:
            tracks = playlist.tracks if isinstance(playlist.tracks, list) else []
            tracks_count = len(tracks)
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
                "tracks_count": tracks_count,
            }
        )
    return rows


def _serialize_comment(
    comment,
    current_user,
    likes_count_by_comment_id=None,
    liked_comment_ids=None,
):
    likes_count_by_comment_id = likes_count_by_comment_id or {}
    liked_comment_ids = liked_comment_ids or set()
    can_delete = False
    if current_user and current_user.is_authenticated:
        can_delete = current_user.id == comment.author_id

    created_dt = localtime(comment.created_at)
    comment_id = comment.id
    return {
        "id": comment_id,
        "text": comment.text,
        "author_username": comment.author.username,
        "author_avatar_url": (
            comment.author.avatar.url if comment.author.avatar else None
        ),
        "author_profile_url": reverse(
            "public_user_page", args=[comment.author.username]
        ),
        "created_at": created_dt.isoformat(),
        "created_at_display": created_dt.strftime("%d.%m.%Y %H:%M"),
        "can_delete": can_delete,
        "parent_id": comment.parent_id,
        "reply_to_user_id": comment.reply_to_user_id,
        "reply_to_username": (
            comment.reply_to_user.username if comment.reply_to_user_id else None
        ),
        "likes_count": int(likes_count_by_comment_id.get(comment_id, 0)),
        "liked_by_me": comment_id in liked_comment_ids,
        "replies": [],
    }


def _comments_likes_snapshot(current_user, comment_ids):
    normalized_ids = [cid for cid in comment_ids if isinstance(cid, int)]
    if not normalized_ids:
        return {}, set()

    likes_count_by_comment_id = {}
    counts_qs = (
        PlaylistCommentLike.objects.filter(comment_id__in=normalized_ids)
        .values("comment_id")
        .annotate(total=Count("id"))
    )
    for row in counts_qs:
        likes_count_by_comment_id[int(row["comment_id"])] = int(row["total"])

    liked_comment_ids = set()
    if current_user and current_user.is_authenticated:
        liked_comment_ids = set(
            PlaylistCommentLike.objects.filter(
                user=current_user, comment_id__in=normalized_ids
            ).values_list("comment_id", flat=True)
        )
    return likes_count_by_comment_id, liked_comment_ids


@sync_to_async
def _list_public_playlist_comments(username, current_user, limit=50):
    user = (
        User.objects.filter(username__iexact=username)
        .only("id", "is_public_favorites")
        .first()
    )
    if not user or not user.is_public_favorites:
        return None, None, 0

    playlist = Playlist.objects.filter(user=user).order_by("created_at").first()
    if playlist is None:
        playlist = Playlist.objects.create(user=user, title="Favorites", tracks=[])

    roots_qs = (
        PlaylistComment.objects.filter(playlist=playlist, parent__isnull=True)
        .select_related("author", "reply_to_user")
        .order_by("-created_at")[: max(1, min(100, int(limit)))]
    )
    root_comments = list(roots_qs)
    root_comments.reverse()

    root_ids = [comment.id for comment in root_comments]
    replies = []
    if root_ids:
        replies_qs = (
            PlaylistComment.objects.filter(playlist=playlist, parent_id__in=root_ids)
            .select_related("author", "reply_to_user")
            .order_by("created_at")
        )
        replies = list(replies_qs)

    all_comment_ids = [comment.id for comment in root_comments] + [
        reply.id for reply in replies
    ]
    likes_count_by_comment_id, liked_comment_ids = _comments_likes_snapshot(
        current_user=current_user,
        comment_ids=all_comment_ids,
    )

    serialized_roots = [
        _serialize_comment(
            comment=comment,
            current_user=current_user,
            likes_count_by_comment_id=likes_count_by_comment_id,
            liked_comment_ids=liked_comment_ids,
        )
        for comment in root_comments
    ]
    roots_map = {row["id"]: row for row in serialized_roots}

    if replies:
        for reply in replies:
            parent_row = roots_map.get(reply.parent_id)
            if not parent_row:
                continue
            parent_row["replies"].append(
                _serialize_comment(
                    comment=reply,
                    current_user=current_user,
                    likes_count_by_comment_id=likes_count_by_comment_id,
                    liked_comment_ids=liked_comment_ids,
                )
            )

    total_count = PlaylistComment.objects.filter(playlist=playlist).count()
    return playlist, serialized_roots, total_count


@sync_to_async
def _create_public_playlist_comment(
    username,
    acting_user,
    text,
    parent_id=None,
    reply_to_comment_id=None,
):
    if not acting_user or not acting_user.is_authenticated:
        return None, None, "unauthorized"

    clean_text = str(text or "").strip()
    if not clean_text:
        return None, None, "empty_text"
    if len(clean_text) > COMMENT_MAX_LENGTH:
        return None, None, "too_long"

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

    parent_comment = None
    reply_to_user = None
    if parent_id is not None:
        try:
            parent_id = int(parent_id)
        except (TypeError, ValueError):
            return playlist, None, "invalid_parent"
        if parent_id <= 0:
            return playlist, None, "invalid_parent"

        parent_comment = (
            PlaylistComment.objects.filter(id=parent_id, playlist=playlist)
            .select_related("parent")
            .first()
        )
        if parent_comment is None:
            return playlist, None, "parent_not_found"
        if parent_comment.parent_id is not None:
            return playlist, None, "parent_not_root"

        if reply_to_comment_id is not None:
            try:
                reply_to_comment_id = int(reply_to_comment_id)
            except (TypeError, ValueError):
                return playlist, None, "invalid_reply_target"
            if reply_to_comment_id <= 0:
                return playlist, None, "invalid_reply_target"

            target_comment = (
                PlaylistComment.objects.filter(
                    id=reply_to_comment_id,
                    playlist=playlist,
                )
                .select_related("author")
                .first()
            )
            if target_comment is None:
                return playlist, None, "invalid_reply_target"
            if target_comment.id != parent_comment.id and (
                target_comment.parent_id != parent_comment.id
            ):
                return playlist, None, "invalid_reply_target"
            reply_to_user = target_comment.author
        else:
            reply_to_user = parent_comment.author
    elif reply_to_comment_id is not None:
        return playlist, None, "invalid_reply_target"

    comment = PlaylistComment.objects.create(
        playlist=playlist,
        author=acting_user,
        text=clean_text,
        parent=parent_comment,
        reply_to_user=reply_to_user,
    )
    return playlist, comment, None


@sync_to_async
def _delete_public_playlist_comment(username, acting_user, comment_id):
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
        return None, None, "not_found"

    comment = (
        PlaylistComment.objects.filter(id=comment_id, playlist=playlist)
        .select_related("author")
        .first()
    )
    if comment is None:
        return playlist, None, "comment_not_found"

    is_author = comment.author_id == acting_user.id
    if not is_author:
        return playlist, comment, "forbidden"

    reply_ids = []
    if comment.parent_id is None:
        has_foreign_replies = (
            PlaylistComment.objects.filter(parent_id=comment.id)
            .exclude(author_id=acting_user.id)
            .exists()
        )
        if has_foreign_replies:
            return playlist, comment, "has_foreign_replies"

        reply_ids = list(
            PlaylistComment.objects.filter(parent_id=comment.id).values_list(
                "id", flat=True
            )
        )

    comment_data = {
        "id": comment.id,
        "deleted_ids": [comment.id, *reply_ids],
    }
    comment.delete()
    return playlist, comment_data, None


@sync_to_async
def _toggle_public_comment_like(username, acting_user, comment_id, should_like):
    if not acting_user or not acting_user.is_authenticated:
        return None, None, None, "unauthorized"

    user = (
        User.objects.filter(username__iexact=username)
        .only("id", "is_public_favorites")
        .first()
    )
    if not user or not user.is_public_favorites:
        return None, None, None, "not_found"

    playlist = Playlist.objects.filter(user=user).order_by("created_at").first()
    if playlist is None:
        return None, None, None, "not_found"

    comment = (
        PlaylistComment.objects.filter(id=comment_id, playlist=playlist)
        .only("id")
        .first()
    )
    if comment is None:
        return playlist, None, None, "comment_not_found"

    if should_like:
        PlaylistCommentLike.objects.get_or_create(comment=comment, user=acting_user)
    else:
        PlaylistCommentLike.objects.filter(comment=comment, user=acting_user).delete()

    likes_count = PlaylistCommentLike.objects.filter(comment=comment).count()
    liked_by_me = PlaylistCommentLike.objects.filter(
        comment=comment, user=acting_user
    ).exists()
    return (
        playlist,
        comment,
        {"likes_count": likes_count, "liked_by_me": liked_by_me},
        None,
    )


@sync_to_async
def _list_public_comment_likers(username, comment_id):
    user = (
        User.objects.filter(username__iexact=username)
        .only("id", "is_public_favorites")
        .first()
    )
    if not user or not user.is_public_favorites:
        return None, None, None, "not_found"

    playlist = Playlist.objects.filter(user=user).order_by("created_at").first()
    if playlist is None:
        return None, None, None, "not_found"

    comment = (
        PlaylistComment.objects.filter(id=comment_id, playlist=playlist)
        .only("id")
        .first()
    )
    if comment is None:
        return playlist, None, None, "comment_not_found"

    likes = (
        PlaylistCommentLike.objects.filter(comment=comment)
        .select_related("user")
        .order_by("-created_at")
    )
    results = []
    for like in likes:
        liked_at = localtime(like.created_at)
        results.append(
            {
                "user_id": like.user_id,
                "username": like.user.username,
                "avatar_url": like.user.avatar.url if like.user.avatar else None,
                "profile_url": reverse("public_user_page", args=[like.user.username]),
                "liked_at": liked_at.isoformat(),
                "liked_at_display": liked_at.strftime("%d.%m.%Y %H:%M"),
            }
        )
    return playlist, comment, results, None


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


class PublicFavoritesCommentsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, username):
        try:
            playlist, comments, total_count = async_to_sync(
                _list_public_playlist_comments
            )(username, request.user)
        except Exception:
            logger.error("Failed to load public playlist comments", exc_info=True)
            return Response(
                {"detail": "Failed to load comments."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if playlist is None:
            return Response(
                {"detail": "Public playlist not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "results": comments,
                "meta": {"count": total_count},
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, username):
        try:
            playlist, comment, error = async_to_sync(_create_public_playlist_comment)(
                username,
                request.user,
                request.data.get("text", ""),
                request.data.get("parent_id", None),
                request.data.get("reply_to_comment_id", None),
            )
        except Exception:
            logger.error("Failed to create public playlist comment", exc_info=True)
            return Response(
                {"detail": "Failed to create comment."},
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
        if error == "empty_text":
            return Response(
                {"detail": "Comment text is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if error == "too_long":
            return Response(
                {"detail": f"Comment is too long (max {COMMENT_MAX_LENGTH})."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if error == "invalid_parent":
            return Response(
                {"detail": "Invalid parent comment id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if error == "parent_not_found":
            return Response(
                {"detail": "Parent comment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if error == "parent_not_root":
            return Response(
                {"detail": "Only one nesting level is allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if error == "invalid_reply_target":
            return Response(
                {"detail": "Invalid reply target."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = _serialize_comment(
            comment=comment,
            current_user=request.user,
        )
        send_public_playlist_comment_event(
            playlist_id=playlist.id,
            payload={"type": "playlist_comment_created", "comment": payload},
        )

        return Response(payload, status=status.HTTP_201_CREATED)


class PublicFavoritesCommentDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def delete(self, request, username, comment_id):
        try:
            playlist, comment, error = async_to_sync(_delete_public_playlist_comment)(
                username, request.user, comment_id
            )
        except Exception:
            logger.error("Failed to delete public playlist comment", exc_info=True)
            return Response(
                {"detail": "Failed to delete comment."},
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
        if error == "comment_not_found":
            return Response(
                {"detail": "Comment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if error == "forbidden":
            return Response(
                {"detail": "You cannot delete this comment."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if error == "has_foreign_replies":
            return Response(
                {
                    "detail": (
                        "You cannot delete this comment because it has replies from "
                        "other users."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        send_public_playlist_comment_event(
            playlist_id=playlist.id,
            payload={
                "type": "playlist_comment_deleted",
                "comment_id": comment["id"],
                "deleted_ids": comment.get("deleted_ids", [comment["id"]]),
            },
        )
        return Response({"detail": "Comment deleted."}, status=status.HTTP_200_OK)


class PublicFavoritesCommentLikeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, username, comment_id):
        return self._handle(request, username, comment_id, should_like=True)

    def delete(self, request, username, comment_id):
        return self._handle(request, username, comment_id, should_like=False)

    def _handle(self, request, username, comment_id, should_like):
        try:
            playlist, comment, data, error = async_to_sync(_toggle_public_comment_like)(
                username=username,
                acting_user=request.user,
                comment_id=comment_id,
                should_like=should_like,
            )
        except Exception:
            logger.error("Failed to toggle public comment like", exc_info=True)
            return Response(
                {"detail": "Failed to toggle comment like."},
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
        if error == "comment_not_found":
            return Response(
                {"detail": "Comment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        send_public_playlist_comment_event(
            playlist_id=playlist.id,
            payload={
                "type": "playlist_comment_like_changed",
                "comment_id": comment.id,
                "likes_count": data["likes_count"],
            },
        )
        return Response(
            {
                "detail": "Liked." if should_like else "Unliked.",
                "comment_id": comment.id,
                "likes_count": data["likes_count"],
                "liked_by_me": data["liked_by_me"],
            },
            status=status.HTTP_200_OK,
        )


class PublicFavoritesCommentLikesListAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, username, comment_id):
        try:
            _, comment, results, error = async_to_sync(_list_public_comment_likers)(
                username=username,
                comment_id=comment_id,
            )
        except Exception:
            logger.error("Failed to load public comment likers", exc_info=True)
            return Response(
                {"detail": "Failed to load comment likes."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if error == "not_found":
            return Response(
                {"detail": "Public playlist not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if error == "comment_not_found":
            return Response(
                {"detail": "Comment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "comment_id": comment.id,
                "results": results,
                "meta": {"count": len(results)},
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
