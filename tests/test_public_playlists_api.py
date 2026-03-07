import uuid

import pytest
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from music_api.models import Playlist, PlaylistComment, PlaylistLike

pytestmark = [pytest.mark.asyncio, pytest.mark.django_db(transaction=True)]


def _bearer(user):
    return {"Authorization": f"Bearer {str(RefreshToken.for_user(user).access_token)}"}


@pytest.fixture
def public_owner(db):
    User = get_user_model()
    suffix = uuid.uuid4().hex[:8]
    user = User.objects.create_user(
        username=f"public_owner_{suffix}",
        email=f"public_owner_{suffix}@example.com",
        password="owner-pass-123",
        is_public_favorites=True,
    )
    # Создаем плейлист для владельца
    from music_api.models import Playlist

    Playlist.objects.create(user=user, title="Public Playlist", tracks=[])
    return user


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


async def test_public_playlist_detail_404_for_private_user(
    async_api_client, public_owner
):
    public_owner.is_public_favorites = False
    await sync_to_async(public_owner.save)(update_fields=["is_public_favorites"])

    response = await async_api_client.get(
        f"/api/playlists/public/{public_owner.username}/"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Public playlist not found."


async def test_public_playlist_detail_returns_liked_by_me(
    async_api_client, public_owner, liker_user
):
    playlist = await sync_to_async(public_owner.playlists.get)(
        title="Favorites"
    )  # Используем Favorites, который возвращает API
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


async def test_public_playlist_like_toggle_flow(
    async_api_client, public_owner, liker_user
):
    unauth_response = await async_api_client.post(
        f"/api/playlists/public/{public_owner.username}/like/"
    )
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


async def test_public_playlist_trending_orders_by_likes(
    async_api_client, public_owner, liker_user
):
    User = get_user_model()
    suffix = uuid.uuid4().hex[:8]
    second_owner = await sync_to_async(User.objects.create_user)(
        username=f"owner2_{suffix}",
        email=f"owner2_{suffix}@example.com",
        password="owner2-pass-123",
        is_public_favorites=True,
    )
    # Создаем плейлист для второго владельца
    second_playlist = await sync_to_async(Playlist.objects.create)(
        user=second_owner, title="Second Playlist", tracks=[]
    )
    extra_liker = await sync_to_async(User.objects.create_user)(
        username=f"liker2_{suffix}",
        email=f"liker2_{suffix}@example.com",
        password="liker2-pass-123",
        is_public_favorites=True,
    )

    first_playlist = await sync_to_async(public_owner.playlists.first)()
    # second_playlist уже создан выше

    await sync_to_async(PlaylistLike.objects.create)(
        playlist=first_playlist, user=liker_user
    )
    await sync_to_async(PlaylistLike.objects.create)(
        playlist=first_playlist, user=extra_liker
    )
    await sync_to_async(PlaylistLike.objects.create)(
        playlist=second_playlist, user=liker_user
    )

    response = await async_api_client.get("/api/playlists/public/trending/?limit=2")
    payload = response.json()

    assert response.status_code == 200
    assert payload["meta"]["count"] == 2
    assert payload["results"][0]["username"] == public_owner.username
    assert payload["results"][0]["likes_count"] == 2
    assert payload["results"][1]["username"] == second_owner.username
    assert payload["results"][1]["likes_count"] == 1


async def test_public_playlist_comments_list_and_create(
    async_api_client, public_owner, liker_user
):
    list_response = await async_api_client.get(
        f"/api/playlists/public/{public_owner.username}/comments/"
    )
    assert list_response.status_code == 200
    assert list_response.json()["results"] == []

    unauth_create = await async_api_client.post(
        f"/api/playlists/public/{public_owner.username}/comments/",
        json={"text": "first"},
    )
    assert unauth_create.status_code == 401

    create_response = await async_api_client.post(
        f"/api/playlists/public/{public_owner.username}/comments/",
        headers=_bearer(liker_user),
        json={"text": "Great playlist"},
    )
    payload = create_response.json()

    assert create_response.status_code == 201
    assert payload["text"] == "Great playlist"
    assert payload["author_username"] == liker_user.username
    assert payload["can_delete"] is True

    list_after = await async_api_client.get(
        f"/api/playlists/public/{public_owner.username}/comments/",
        headers=_bearer(liker_user),
    )
    list_payload = list_after.json()
    assert list_after.status_code == 200
    assert list_payload["meta"]["count"] == 1
    assert list_payload["results"][0]["text"] == "Great playlist"


async def test_public_playlist_comments_delete_permissions(
    async_api_client, public_owner, liker_user
):
    User = get_user_model()
    suffix = uuid.uuid4().hex[:8]
    third_user = await sync_to_async(User.objects.create_user)(
        username=f"third_{suffix}",
        email=f"third_{suffix}@example.com",
        password="third-pass-123",
        is_public_favorites=True,
    )

    playlist = await sync_to_async(
        lambda: Playlist.objects.filter(user=public_owner)
        .order_by("created_at")
        .first()
    )()
    comment = await sync_to_async(PlaylistComment.objects.create)(
        playlist=playlist, author=liker_user, text="remove me"
    )

    forbidden = await async_api_client.delete(
        f"/api/playlists/public/{public_owner.username}/comments/{comment.id}/",
        headers=_bearer(third_user),
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["detail"] == "You cannot delete this comment."

    deleted_by_owner = await async_api_client.delete(
        f"/api/playlists/public/{public_owner.username}/comments/{comment.id}/",
        headers=_bearer(public_owner),
    )
    assert deleted_by_owner.status_code == 403
    assert deleted_by_owner.json()["detail"] == "You cannot delete this comment."

    deleted_by_author = await async_api_client.delete(
        f"/api/playlists/public/{public_owner.username}/comments/{comment.id}/",
        headers=_bearer(liker_user),
    )
    assert deleted_by_author.status_code == 200
    assert deleted_by_author.json()["detail"] == "Comment deleted."

    exists = await sync_to_async(PlaylistComment.objects.filter(id=comment.id).exists)()
    assert exists is False


async def test_public_playlist_comments_support_single_level_replies(
    async_api_client, public_owner, liker_user
):
    root_response = await async_api_client.post(
        f"/api/playlists/public/{public_owner.username}/comments/",
        headers=_bearer(liker_user),
        json={"text": "Root comment"},
    )
    assert root_response.status_code == 201
    root_payload = root_response.json()
    assert root_payload["parent_id"] is None

    reply_response = await async_api_client.post(
        f"/api/playlists/public/{public_owner.username}/comments/",
        headers=_bearer(public_owner),
        json={"text": "Reply comment", "parent_id": root_payload["id"]},
    )
    assert reply_response.status_code == 201
    reply_payload = reply_response.json()
    assert reply_payload["parent_id"] == root_payload["id"]

    list_response = await async_api_client.get(
        f"/api/playlists/public/{public_owner.username}/comments/",
        headers=_bearer(liker_user),
    )
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload["meta"]["count"] == 2
    assert len(list_payload["results"]) == 1
    assert list_payload["results"][0]["id"] == root_payload["id"]
    assert len(list_payload["results"][0]["replies"]) == 1
    assert list_payload["results"][0]["replies"][0]["id"] == reply_payload["id"]


async def test_public_playlist_comments_reject_reply_to_reply(
    async_api_client, public_owner, liker_user
):
    root_response = await async_api_client.post(
        f"/api/playlists/public/{public_owner.username}/comments/",
        headers=_bearer(liker_user),
        json={"text": "Root"},
    )
    assert root_response.status_code == 201
    root_id = root_response.json()["id"]

    reply_response = await async_api_client.post(
        f"/api/playlists/public/{public_owner.username}/comments/",
        headers=_bearer(public_owner),
        json={"text": "Reply", "parent_id": root_id},
    )
    assert reply_response.status_code == 201
    reply_id = reply_response.json()["id"]

    nested_reply = await async_api_client.post(
        f"/api/playlists/public/{public_owner.username}/comments/",
        headers=_bearer(liker_user),
        json={"text": "Nested reply should fail", "parent_id": reply_id},
    )
    assert nested_reply.status_code == 400
    assert nested_reply.json()["detail"] == "Only one nesting level is allowed."


async def test_public_playlist_comments_delete_root_also_deletes_replies(
    async_api_client, public_owner, liker_user
):
    playlist = await sync_to_async(
        lambda: Playlist.objects.filter(user=public_owner)
        .order_by("created_at")
        .first()
    )()
    root = await sync_to_async(PlaylistComment.objects.create)(
        playlist=playlist,
        author=liker_user,
        text="root to delete",
    )
    reply = await sync_to_async(PlaylistComment.objects.create)(
        playlist=playlist,
        parent=root,
        author=public_owner,
        text="reply to delete",
    )

    delete_response = await async_api_client.delete(
        f"/api/playlists/public/{public_owner.username}/comments/{root.id}/",
        headers=_bearer(liker_user),
    )
    assert delete_response.status_code == 200

    root_exists = await sync_to_async(
        PlaylistComment.objects.filter(id=root.id).exists
    )()
    reply_exists = await sync_to_async(
        PlaylistComment.objects.filter(id=reply.id).exists
    )()
    assert root_exists is False
    assert reply_exists is False
