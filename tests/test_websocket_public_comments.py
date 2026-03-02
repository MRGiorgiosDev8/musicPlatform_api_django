import pytest
from asgiref.sync import sync_to_async
from channels.testing.websocket import WebsocketCommunicator
from django.contrib.auth import get_user_model

from music_api.models import Playlist
from music_api.ws import send_public_playlist_comment_event
from music_project.asgi import application

pytestmark = pytest.mark.django_db(transaction=True)


@pytest.mark.asyncio
async def test_public_comments_websocket_receives_comment_event():
    User = get_user_model()
    owner = await sync_to_async(User.objects.create_user)(
        username="ws_public_comments_owner",
        email="ws_public_comments_owner@example.com",
        password="test-pass-123",
        is_public_favorites=True,
    )
    playlist = await sync_to_async(
        lambda: Playlist.objects.filter(user=owner).order_by("created_at").first()
    )()
    assert playlist is not None

    communicator = WebsocketCommunicator(
        application,
        f"/ws/comments/public/{owner.username}/",
        headers=[
            (b"host", b"testserver"),
            (b"origin", b"http://testserver"),
        ],
    )
    connected, _ = await communicator.connect()
    assert connected is True

    await sync_to_async(send_public_playlist_comment_event)(
        playlist.id,
        {
            "type": "playlist_comment_created",
            "comment": {
                "id": 77,
                "text": "live message",
                "author_username": owner.username,
                "author_profile_url": f"/u/{owner.username}/",
                "created_at": "2026-03-02T00:00:00+00:00",
                "created_at_display": "02.03.2026 00:00",
                "can_delete": False,
            },
        },
    )
    payload = await communicator.receive_json_from(timeout=2)
    assert payload["type"] == "playlist_comment_created"
    assert payload["comment"]["text"] == "live message"

    await communicator.disconnect()


@pytest.mark.asyncio
async def test_public_comments_websocket_rejects_private_profile():
    User = get_user_model()
    owner = await sync_to_async(User.objects.create_user)(
        username="ws_private_comments_owner",
        email="ws_private_comments_owner@example.com",
        password="test-pass-123",
        is_public_favorites=False,
    )
    await sync_to_async(Playlist.objects.create)(
        user=owner, title="Favorites", tracks=[]
    )

    communicator = WebsocketCommunicator(
        application,
        f"/ws/comments/public/{owner.username}/",
        headers=[
            (b"host", b"testserver"),
            (b"origin", b"http://testserver"),
        ],
    )
    connected, _ = await communicator.connect()
    assert connected is False
