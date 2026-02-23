import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from music_api.models import Playlist, PlaylistLike, PlaylistLikeNotification

pytestmark = pytest.mark.django_db


def test_playlist_belongs_to_user_and_available_via_related_name(user):
    assert user.playlists.count() == 2
    auto_playlist = user.playlists.get(title="Favorites")
    manual_playlist = Playlist.objects.create(
        user=user, title="Custom Playlist", tracks=[]
    )

    assert user.playlists.count() == 3
    assert manual_playlist.user_id == user.id
    assert manual_playlist in user.playlists.all()
    assert auto_playlist in user.playlists.all()


def test_playlist_is_deleted_when_user_is_deleted(user):
    playlist = Playlist.objects.create(
        user=user,
        title="Favorites",
        tracks=[{"name": "Numb", "artist": "Linkin Park"}],
    )

    user.delete()

    assert not Playlist.objects.filter(id=playlist.id).exists()


def test_playlist_tracks_jsonfield_accepts_valid_json_payload(user):
    payload = [
        {"name": "Numb", "artist": "Linkin Park"},
        {"name": "In The End", "artist": "Linkin Park"},
    ]
    playlist = Playlist(user=user, title="Favorites", tracks=payload)

    playlist.full_clean()
    playlist.save()

    playlist.refresh_from_db()
    assert playlist.tracks == payload


def test_playlist_tracks_jsonfield_rejects_non_json_serializable_value(user):
    playlist = Playlist(user=user, title="Favorites", tracks={"bad_set": {1, 2, 3}})

    with pytest.raises(ValidationError):
        playlist.full_clean()


def test_playlist_tracks_default_list_is_not_shared_between_instances(user):
    first = Playlist.objects.create(user=user, title="Favorites")
    second = Playlist.objects.create(user=user, title="Road Trip")

    first.tracks.append({"name": "Track 1", "artist": "Artist 1"})
    first.save(update_fields=["tracks"])
    second.refresh_from_db()

    assert first.tracks != second.tracks
    assert second.tracks == []


def test_playlist_like_unique_constraint(user):
    playlist = Playlist.objects.create(user=user, title="Test Playlist", tracks=[])
    liker = get_user_model().objects.create_user(
        username="liker_unique",
        email="liker_unique@example.com",
        password="test-pass-123",
    )

    PlaylistLike.objects.create(playlist=playlist, user=liker)

    with pytest.raises(IntegrityError):
        PlaylistLike.objects.create(playlist=playlist, user=liker)


def test_playlist_like_signal_creates_notification_for_owner(user):
    playlist = user.playlists.get(title="Favorites")
    liker = get_user_model().objects.create_user(
        username="liker_signal",
        email="liker_signal@example.com",
        password="test-pass-123",
    )

    PlaylistLike.objects.create(playlist=playlist, user=liker)

    notification = PlaylistLikeNotification.objects.get()
    assert notification.playlist == playlist
    assert notification.actor == liker
    assert notification.recipient == user


def test_playlist_like_signal_skips_notification_for_self_like(user):
    playlist = user.playlists.get(title="Favorites")

    PlaylistLike.objects.create(playlist=playlist, user=user)

    assert (
        PlaylistLikeNotification.objects.filter(
            recipient=user,
        ).count()
        == 0
    )
