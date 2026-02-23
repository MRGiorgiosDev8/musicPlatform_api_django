import pytest

from music_api.views.artists_async import LASTFM_CHART_LIMIT
from music_api.views.tracks_async import LASTFM_BATCH_LIMIT, YearChartAPIView

pytestmark = [pytest.mark.asyncio, pytest.mark.django_db(transaction=True)]


async def test_track_search_requires_query(async_api_client):
    response = await async_api_client.get("/music_api/search/")

    assert response.status_code == 400
    assert response.json()["error"] == "Query required"


async def test_year_chart_rejects_bad_limit(async_api_client):
    response = await async_api_client.get(
        f"/music_api/year-chart/?limit={LASTFM_BATCH_LIMIT + 1}"
    )

    assert response.status_code == 400
    assert "Limit must be" in response.json()["error"]


async def test_year_chart_uses_cache_on_second_request(async_api_client, monkeypatch):
    calls = {"count": 0}
    payload = [
        {
            "name": "Numb",
            "artist": "Linkin Park",
            "listeners": 10,
            "playcount": 20,
            "url": "https://example.org/track",
            "image_url": "https://example.org/cover.jpg",
            "mbid": "",
        }
    ]

    async def fake_get_chart(self, genre, limit):
        calls["count"] += 1
        return payload

    monkeypatch.setattr(YearChartAPIView, "_get_chart_data_async", fake_get_chart)

    first = await async_api_client.get("/music_api/year-chart/?limit=5")
    second = await async_api_client.get("/music_api/year-chart/?limit=5")

    assert first.status_code == 200
    assert first.json()["meta"]["cached"] is False
    assert second.status_code == 200
    assert second.json()["meta"]["cached"] is True
    assert calls["count"] == 1


async def test_trending_rejects_bad_limit(async_api_client):
    response = await async_api_client.get(
        f"/music_api/trending/?limit={LASTFM_CHART_LIMIT + 1}"
    )

    assert response.status_code == 400
    assert "Limit must be" in response.json()["error"]
