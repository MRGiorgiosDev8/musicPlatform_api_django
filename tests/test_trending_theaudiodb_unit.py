import pytest

import music_api.views.artists_async as artists_async

pytestmark = pytest.mark.asyncio


async def test_async_get_artists_uses_theaudiodb_images(monkeypatch):
    async def fake_chart(limit):
        assert limit == 2
        return [
            {"name": "Rihanna", "listeners": 100, "playcount": 200, "image": []},
            {"name": "Drake", "listeners": 90, "playcount": 180, "image": []},
        ]

    async def fake_images(artists):
        assert [artist["name"] for artist in artists] == ["Rihanna", "Drake"]
        return {
            "Rihanna": "https://img.example/rihanna.jpg",
            "Drake": "https://img.example/drake.jpg",
        }

    async def fake_releases(_artists):
        return {"Rihanna": [], "Drake": []}

    monkeypatch.setattr(artists_async, "_get_lastfm_artists_chart_async", fake_chart)
    monkeypatch.setattr(
        artists_async, "_get_theaudiodb_artists_batch_async", fake_images
    )
    monkeypatch.setattr(
        artists_async, "_get_lastfm_releases_batch_async", fake_releases
    )

    payload, cached = await artists_async._async_get_artists(limit=2)

    assert cached is False
    assert payload["artists"][0]["photo_url"] == "https://img.example/rihanna.jpg"
    assert payload["artists"][1]["photo_url"] == "https://img.example/drake.jpg"
