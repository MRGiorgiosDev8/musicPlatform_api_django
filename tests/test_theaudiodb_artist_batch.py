import pytest
import respx

from django.core.cache import cache

from music_api.views.services_async import _get_theaudiodb_artists_batch_async

pytestmark = pytest.mark.asyncio


async def test_theaudiodb_artist_batch_uses_exact_name_match_and_cache():
    cache.clear()

    artists = [{"name": "Rihanna", "mbid": "f4dbd199-4f02-4b64-8bc2-d5c4b7d2d2c7"}]

    with respx.mock(assert_all_called=True) as mock:
        route = mock.get(
            "https://www.theaudiodb.com/api/v1/json/123/artist-mb.php"
        ).respond(
            200,
            json={
                "artists": [
                    {
                        "strArtist": "PartyNextDoor",
                        "strArtistThumb": "https://img.example/wrong.jpg",
                        "strMusicBrainzID": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                    },
                    {
                        "strArtist": "Rihanna",
                        "strArtistThumb": "https://img.example/rihanna.jpg",
                        "strMusicBrainzID": "f4dbd199-4f02-4b64-8bc2-d5c4b7d2d2c7",
                    },
                ]
            },
        )

        first = await _get_theaudiodb_artists_batch_async(artists)
        second = await _get_theaudiodb_artists_batch_async(artists)

    assert first["Rihanna"] == "https://img.example/rihanna.jpg"
    assert second["Rihanna"] == "https://img.example/rihanna.jpg"
    assert route.called
    assert len(route.calls) == 1


async def test_theaudiodb_artist_batch_falls_back_to_name_search():
    cache.clear()

    with respx.mock(assert_all_called=True) as mock:
        route = mock.get(
            "https://www.theaudiodb.com/api/v1/json/123/search.php"
        ).respond(
            200,
            json={
                "artists": [
                    {
                        "strArtist": "Rihanna",
                        "strArtistThumb": "https://img.example/rihanna-search.jpg",
                        "strMusicBrainzID": "",
                    }
                ]
            },
        )

        result = await _get_theaudiodb_artists_batch_async([{"name": "Rihanna"}])

    assert result["Rihanna"] == "https://img.example/rihanna-search.jpg"
    assert route.called
    assert len(route.calls) == 1
