import pytest
from asgiref.sync import sync_to_async
from channels.testing.websocket import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import Client

from music_api.models import Playlist, PlaylistLike
from music_project.asgi import application

pytestmark = pytest.mark.django_db(transaction=True)


@pytest.mark.asyncio
async def test_websocket_rejects_anonymous_user():
    communicator = WebsocketCommunicator(application, "/ws/notifications/")
    connected, _ = await communicator.connect()

    assert connected is False


@pytest.mark.asyncio
async def test_websocket_pushes_like_notification_to_recipient(user):
    client = Client()
    await sync_to_async(client.force_login)(user)
    session_cookie = client.cookies["sessionid"].value

    communicator = WebsocketCommunicator(
        application,
        "/ws/notifications/",
        headers=[
            (b"host", b"testserver"),
            (b"origin", b"http://testserver"),
            (b"cookie", f"sessionid={session_cookie}".encode("utf-8")),
        ],
    )
    connected, _ = await communicator.connect()
    assert connected is True

    User = get_user_model()
    actor = await sync_to_async(User.objects.create_user)(
        username="ws_actor_user",
        email="ws_actor_user@example.com",
        password="test-pass-123",
    )

    recipient_playlist = await sync_to_async(
        lambda: Playlist.objects.filter(user=user).order_by("-created_at").first()
    )()
    assert recipient_playlist is not None

    await sync_to_async(PlaylistLike.objects.create)(
        playlist=recipient_playlist,
        user=actor,
    )

    payload = await communicator.receive_json_from(timeout=2)

    assert payload["type"] == "playlist_like"
    assert payload["actor_username"] == actor.username
    assert payload["playlist_title"] == recipient_playlist.title
    assert payload["message"]

    await communicator.disconnect()
