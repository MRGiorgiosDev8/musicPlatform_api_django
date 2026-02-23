import pytest
import respx

from music_api.views.services_async import _get_itunes_batch_async

pytestmark = [pytest.mark.asyncio, pytest.mark.django_db(transaction=True)]


async def test_itunes_batch_enriches_and_uses_cache():
    track = {"name": "Numb", "artist": "Linkin Park"}

    with respx.mock(assert_all_called=True) as mock:
        route = mock.get("https://itunes.apple.com/search").respond(
            200,
            json={
                "results": [
                    {
                        "trackName": "Numb",
                        "artistName": "Linkin Park",
                        "artworkUrl100": "https://img.example/100x100bb.jpg",
                        "previewUrl": "https://audio.example/numb.m4a",
                    }
                ]
            },
        )

        first = await _get_itunes_batch_async([track])
        second = await _get_itunes_batch_async([track])

    key = ("Numb", "Linkin Park")
    assert key in first
    assert first[key]["cover"] == "https://img.example/600x600bb.jpg"
    assert first[key]["preview"] == "https://audio.example/numb.m4a"
    assert second[key] == first[key]
    assert route.called
    assert len(route.calls) == 1
