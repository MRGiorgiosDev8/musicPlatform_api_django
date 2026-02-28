import pytest

pytestmark = [pytest.mark.asyncio, pytest.mark.django_db(transaction=True)]


async def test_wikipedia_artists_batch_success(async_api_client, monkeypatch):
    async def fake_batch(artist_names, lang):
        assert artist_names == ["Eminem", "Drake"]
        assert lang == "ru"
        return {
            "Eminem": {
                "bio": "Американский рэпер.",
                "title": "Eminem",
                "source_url": "https://ru.wikipedia.org/wiki/Eminem",
                "image_url": "https://upload.wikimedia.org/example-eminem.jpg",
                "lang": "ru",
            },
            "Drake": {
                "bio": "Канадский исполнитель.",
                "title": "Drake",
                "source_url": "https://ru.wikipedia.org/wiki/Drake",
                "image_url": "https://upload.wikimedia.org/example-drake.jpg",
                "lang": "ru",
            },
        }

    monkeypatch.setattr(
        "music_api.views.wikipedia_async._get_wikipedia_artist_bios_batch_async",
        fake_batch,
    )

    response = await async_api_client.post(
        "/api/wikipedia/artists/",
        json={"artists": ["Eminem", "Drake"], "lang": "ru"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["lang_requested"] == "ru"
    assert payload["meta"]["count"] == 2
    assert payload["artists"]["Eminem"]["title"] == "Eminem"
    assert payload["artists"]["Eminem"]["bio"] == "Американский рэпер."


async def test_wikipedia_artists_batch_rejects_non_list(async_api_client):
    response = await async_api_client.post(
        "/api/wikipedia/artists/",
        json={"artists": "Eminem", "lang": "ru"},
    )

    assert response.status_code == 400
    assert response.json()["error"] == "artists must be an array of artist names"


async def test_wikipedia_artists_batch_rejects_too_many_artists(async_api_client):
    artists = [f"Artist {idx}" for idx in range(31)]
    response = await async_api_client.post(
        "/api/wikipedia/artists/",
        json={"artists": artists, "lang": "ru"},
    )

    assert response.status_code == 400
    assert response.json()["error"] == "artists length must be <= 30"


async def test_wikipedia_artists_batch_returns_500_on_service_error(
    async_api_client, monkeypatch
):
    async def fake_batch(_artist_names, _lang):
        raise RuntimeError("Service down")

    monkeypatch.setattr(
        "music_api.views.wikipedia_async._get_wikipedia_artist_bios_batch_async",
        fake_batch,
    )

    response = await async_api_client.post(
        "/api/wikipedia/artists/",
        json={"artists": ["Eminem"], "lang": "ru"},
    )

    assert response.status_code == 500
    payload = response.json()
    assert payload["error"] == "Failed to fetch Wikipedia artist data"
    assert payload["artists"] == {}
