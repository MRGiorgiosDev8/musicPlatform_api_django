import pytest
from asgiref.sync import sync_to_async
from channels.testing.websocket import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import Client

from music_project.asgi import application

pytestmark = pytest.mark.django_db(transaction=True)


async def _receive_presence_status(communicator, user_id: int, timeout: float = 2):
    while True:
        payload = await communicator.receive_json_from(timeout=timeout)
        if (
            payload.get("type") == "presence_status"
            and payload.get("user_id") == user_id
        ):
            return payload


async def _connect_as_user(user):
    client = Client()
    await sync_to_async(client.force_login)(user)
    session_cookie = client.cookies["sessionid"].value

    communicator = WebsocketCommunicator(
        application,
        "/ws/presence/",
        headers=[
            (b"host", b"testserver"),
            (b"origin", b"http://testserver"),
            (b"cookie", f"sessionid={session_cookie}".encode("utf-8")),
        ],
    )
    connected, _ = await communicator.connect()
    assert connected is True
    return communicator


@pytest.mark.asyncio
async def test_presence_allows_anonymous_and_returns_initial_status():
    communicator = WebsocketCommunicator(
        application,
        "/ws/presence/",
        headers=[
            (b"host", b"testserver"),
            (b"origin", b"http://testserver"),
        ],
    )
    connected, _ = await communicator.connect()

    assert connected is True

    await communicator.send_json_to({"action": "watch_user", "user_id": 99999})
    payload = await _receive_presence_status(communicator, user_id=99999, timeout=2)

    assert payload["type"] == "presence_status"
    assert payload["user_id"] == 99999
    assert payload["is_online"] is False

    await communicator.disconnect()


@pytest.mark.asyncio
async def test_presence_tracks_online_status_and_handles_multiple_connections(user):
    User = get_user_model()
    target_user = await sync_to_async(User.objects.create_user)(
        username="presence_target_user",
        email="presence_target_user@example.com",
        password="test-pass-123",
    )

    watcher = await _connect_as_user(user)
    await watcher.send_json_to({"action": "watch_user", "user_id": target_user.id})
    initial = await _receive_presence_status(watcher, user_id=target_user.id, timeout=2)
    assert initial["is_online"] is False

    target_conn_one = await _connect_as_user(target_user)
    became_online = await _receive_presence_status(
        watcher, user_id=target_user.id, timeout=2
    )
    assert became_online["type"] == "presence_status"
    assert became_online["user_id"] == target_user.id
    assert became_online["is_online"] is True

    target_conn_two = await _connect_as_user(target_user)
    await watcher.send_json_to({"action": "watch_user", "user_id": target_user.id})
    still_online = await _receive_presence_status(
        watcher, user_id=target_user.id, timeout=2
    )
    assert still_online["is_online"] is True

    await target_conn_one.disconnect()
    await watcher.send_json_to({"action": "watch_user", "user_id": target_user.id})
    after_first_disconnect = await _receive_presence_status(
        watcher, user_id=target_user.id, timeout=2
    )
    assert after_first_disconnect["is_online"] is True

    await target_conn_two.disconnect()
    became_offline = await _receive_presence_status(
        watcher, user_id=target_user.id, timeout=2
    )
    assert became_offline["type"] == "presence_status"
    assert became_offline["user_id"] == target_user.id
    assert became_offline["is_online"] is False

    await watcher.disconnect()
