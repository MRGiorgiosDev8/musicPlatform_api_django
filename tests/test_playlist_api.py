import pytest

from music_api.models import Playlist


pytestmark = [pytest.mark.asyncio, pytest.mark.django_db(transaction=True)]


async def test_playlist_me_works_without_auth(async_api_client):
    response = await async_api_client.get("/api/playlists/me/")

    assert response.status_code == 200
    assert "title" in response.json()
    assert "tracks" in response.json()


async def test_playlist_me_creates_favorites_and_enriches(async_api_client, user, monkeypatch):
    called = {"tracks": None}

    async def fake_enrich(tracks):
        called["tracks"] = tracks
        return [{"name": "Track", "artist": "Artist"}]

    monkeypatch.setattr("music_api.views.playlists_async._enrich_tracks_list_async", fake_enrich)

    response = await async_api_client.get("/api/playlists/me/")

    from asgiref.sync import sync_to_async
    exists = await sync_to_async(Playlist.objects.filter(user=user, title="Favorites").exists)()
    
    assert response.status_code == 200
    assert exists
    assert called["tracks"] == []
    assert response.json()["title"] == "Favorites"
    assert response.json()["tracks"] == [{"name": "Track", "artist": "Artist"}]


async def test_playlist_add_track_and_conflict(async_api_client, user):
    first = await async_api_client.post(
        "/api/playlists/me/tracks/",
        json={"name": "  Numb  ", "artist": " Linkin Park "},
    )
    second = await async_api_client.post(
        "/api/playlists/me/tracks/",
        json={"name": "numb", "artist": "linkin park"},
    )

    from asgiref.sync import sync_to_async
    playlist = await sync_to_async(Playlist.objects.get)(user=user, title="Favorites")

    assert first.status_code == 201
    assert second.status_code == 409
    assert len(playlist.tracks) == 1
    assert playlist.tracks[0] == {"name": "Numb", "artist": "Linkin Park"}
