import pytest

from music_api.views import artists_async

pytestmark = [pytest.mark.asyncio, pytest.mark.django_db(transaction=True)]


async def test_artist_search_requires_query(async_api_client):
    response = await async_api_client.get("/music_api/search/artists/")

    assert response.status_code == 400
    assert response.json()["error"] == "Query required"


async def test_artist_search_returns_results(async_api_client, monkeypatch):
    async def fake_search(query, limit=20):
        return [
            {"name": "Lil Yachty", "listeners": "1000", "mbid": "1"},
            {"name": "Post Malone", "listeners": "2000", "mbid": "2"},
        ]

    monkeypatch.setattr(artists_async, "_search_lastfm_artists_async", fake_search)

    response = await async_api_client.get("/music_api/search/artists/?q=lil")

    assert response.status_code == 200
    payload = response.json()
    assert "results" in payload
    assert payload["results"][0]["name"] == "Lil Yachty"
    assert payload["results"][0]["listeners"] == 1000


async def test_artist_search_uses_cache_on_second_request(
    async_api_client, monkeypatch
):
    calls = {"count": 0}

    async def fake_search(query, limit=20):
        calls["count"] += 1
        return [{"name": "Kendrick Lamar", "listeners": "123", "mbid": ""}]

    monkeypatch.setattr(artists_async, "_search_lastfm_artists_async", fake_search)

    first = await async_api_client.get("/music_api/search/artists/?q=kendrick")
    second = await async_api_client.get("/music_api/search/artists/?q=kendrick")

    assert first.status_code == 200
    assert first.json()["meta"]["cached"] is False
    assert second.status_code == 200
    assert second.json()["meta"]["cached"] is True
    assert calls["count"] == 1
