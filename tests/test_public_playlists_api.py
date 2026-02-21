import uuid

import pytest
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from music_api.models import Playlist, PlaylistLike


pytestmark = [pytest.mark.asyncio, pytest.mark.django_db(transaction=True)]


def _bearer(user):
    return {"Authorization": f"Bearer {str(RefreshToken.for_user(user).access_token)}"}


@pytest.fixture
def public_owner(db):
    User = get_user_model()
    suffix = uuid.uuid4().hex[:8]
    return User.objects.create_user(
        username=f"owner_{suffix}",
        email=f"owner_{suffix}@example.com",
        password="owner-pass-123",
        is_public_favorites=True,
    )


@pytest.fixture
def liker_user(db):
    User = get_user_model()
    suffix = uuid.uuid4().hex[:8]
    return User.objects.create_user(
        username=f"liker_{suffix}",
        email=f"liker_{suffix}@example.com",
        password="liker-pass-123",
        is_public_favorites=True,
    )


async def test_public_playlist_detail_404_for_private_user(async_api_client, public_owner):
    public_owner.is_public_favorites = False
    await sync_to_async(public_owner.save)(update_fields=["is_public_favorites"])

    response = await async_api_client.get(f"/api/playlists/public/{public_owner.username}/")

    assert response.status_code == 404
    assert response.json()["detail"] == "Public playlist not found."


async def test_public_playlist_detail_returns_liked_by_me(async_api_client, public_owner, liker_user):
    playlist = await sync_to_async(Playlist.objects.filter(user=public_owner).order_by("created_at").first)()
    await sync_to_async(PlaylistLike.objects.create)(playlist=playlist, user=liker_user)

    response = await async_api_client.get(
        f"/api/playlists/public/{public_owner.username}/",
        headers=_bearer(liker_user),
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["owner"]["username"] == public_owner.username
    assert payload["playlist"]["likes_count"] == 1
    assert payload["playlist"]["liked_by_me"] is True


async def test_public_playlist_like_toggle_flow(async_api_client, public_owner, liker_user):
    unauth_response = await async_api_client.post(f"/api/playlists/public/{public_owner.username}/like/")
    assert unauth_response.status_code == 401

    like_response = await async_api_client.post(
        f"/api/playlists/public/{public_owner.username}/like/",
        headers=_bearer(liker_user),
    )
    unlike_response = await async_api_client.delete(
        f"/api/playlists/public/{public_owner.username}/like/",
        headers=_bearer(liker_user),
    )

    assert like_response.status_code == 200
    assert like_response.json()["liked_by_me"] is True
    assert like_response.json()["likes_count"] == 1

    assert unlike_response.status_code == 200
    assert unlike_response.json()["liked_by_me"] is False
    assert unlike_response.json()["likes_count"] == 0


async def test_public_playlist_like_forbids_self_like(async_api_client, public_owner):
    response = await async_api_client.post(
        f"/api/playlists/public/{public_owner.username}/like/",
        headers=_bearer(public_owner),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "You cannot like your own public playlist."


async def test_public_playlist_trending_rejects_bad_limit(async_api_client):
    response = await async_api_client.get("/api/playlists/public/trending/?limit=31")

    assert response.status_code == 400
    assert response.json()["detail"] == "Limit must be 1-30."


async def test_public_playlist_trending_orders_by_likes(async_api_client, public_owner, liker_user):
    User = get_user_model()
    suffix = uuid.uuid4().hex[:8]
    second_owner = await sync_to_async(User.objects.create_user)(
        username=f"owner2_{suffix}",
        email=f"owner2_{suffix}@example.com",
        password="owner2-pass-123",
        is_public_favorites=True,
    )
    extra_liker = await sync_to_async(User.objects.create_user)(
        username=f"liker2_{suffix}",
        email=f"liker2_{suffix}@example.com",
        password="liker2-pass-123",
        is_public_favorites=True,
    )

    first_playlist = await sync_to_async(Playlist.objects.filter(user=public_owner).order_by("created_at").first)()
    second_playlist = await sync_to_async(Playlist.objects.filter(user=second_owner).order_by("created_at").first)()

    await sync_to_async(PlaylistLike.objects.create)(playlist=first_playlist, user=liker_user)
    await sync_to_async(PlaylistLike.objects.create)(playlist=first_playlist, user=extra_liker)
    await sync_to_async(PlaylistLike.objects.create)(playlist=second_playlist, user=liker_user)

    response = await async_api_client.get("/api/playlists/public/trending/?limit=2")
    payload = response.json()

    assert response.status_code == 200
    assert payload["meta"]["count"] == 2
    assert payload["results"][0]["username"] == public_owner.username
    assert payload["results"][0]["likes_count"] == 2
    assert payload["results"][1]["username"] == second_owner.username
    assert payload["results"][1]["likes_count"] == 1
