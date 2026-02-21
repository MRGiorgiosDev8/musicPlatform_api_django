import pytest
from asgiref.sync import sync_to_async

from music_api.models import Playlist

pytestmark = [pytest.mark.asyncio, pytest.mark.django_db(transaction=True)]


@pytest.mark.django_db(transaction=True)
async def test_playlist_me_requires_auth(async_api_client):
    response = await async_api_client.get("/api/playlists/me/")

    assert response.status_code == 401


@pytest.mark.django_db(transaction=True)
async def test_playlist_me_creates_favorites_and_enriches(authorized_async_api_client, user, monkeypatch):
    called = {"tracks": None}

    async def fake_enrich(tracks):
        called["tracks"] = tracks
        return [{"name": "Track", "artist": "Artist"}]

    monkeypatch.setattr("music_api.views.playlists_async._enrich_tracks_list_async", fake_enrich)

    response = await authorized_async_api_client.get("/api/playlists/me/")

    exists = await sync_to_async(Playlist.objects.filter(user=user, title="Favorites").exists)()
    
    assert response.status_code == 200
    assert exists
    assert called["tracks"] == []
    assert response.json()["title"] == "Favorites"
    assert response.json()["tracks"] == [{"name": "Track", "artist": "Artist"}]


@pytest.mark.django_db(transaction=True)
async def test_playlist_add_track_and_conflict(authorized_async_api_client, user):
    first = await authorized_async_api_client.post(
        "/api/playlists/me/tracks/",
        json={"name": "  Numb  ", "artist": " Linkin Park "},
    )
    second = await authorized_async_api_client.post(
        "/api/playlists/me/tracks/",
        json={"name": "numb", "artist": "linkin park"},
    )

    playlist = await sync_to_async(Playlist.objects.get)(user=user, title="Favorites")

    assert first.status_code == 201
    assert second.status_code == 409
    assert len(playlist.tracks) == 1
    assert playlist.tracks[0] == {"name": "Numb", "artist": "Linkin Park"}


@pytest.mark.django_db(transaction=True)
async def test_playlist_me_patch_updates_title(authorized_async_api_client, user):
    response = await authorized_async_api_client.patch(
        "/api/playlists/me/",
        json={"title": "My Daily Mix"},
    )

    playlist = await sync_to_async(Playlist.objects.filter(user=user).order_by("created_at").first)()

    assert response.status_code == 200
    assert response.json()["detail"] == "Title updated."
    assert response.json()["title"] == "My Daily Mix"
    assert playlist is not None
    assert playlist.title == "My Daily Mix"


@pytest.mark.django_db(transaction=True)
async def test_playlist_me_patch_rejects_empty_title(authorized_async_api_client):
    response = await authorized_async_api_client.patch(
        "/api/playlists/me/",
        json={"title": "   "},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Title is required."


@pytest.mark.django_db(transaction=True)
async def test_playlist_me_patch_rejects_too_long_title(authorized_async_api_client):
    response = await authorized_async_api_client.patch(
        "/api/playlists/me/",
        json={"title": "a" * 256},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Title is too long."
