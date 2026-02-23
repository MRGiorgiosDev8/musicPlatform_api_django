import uuid

import pytest
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model

pytestmark = [pytest.mark.asyncio, pytest.mark.django_db(transaction=True)]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def second_user(db):
    User = get_user_model()
    suffix = uuid.uuid4().hex[:8]
    return User.objects.create_user(
        username=f"second_{suffix}",
        email=f"second_{suffix}@example.com",
        password="second-pass-123",
    )


async def test_jwt_token_obtain_pair_success(async_api_client, user):
    response = await async_api_client.post(
        "/api/auth/token/",
        json={"username": user.username, "password": "test-pass-123"},
    )

    payload = response.json()
    assert response.status_code == 200
    assert isinstance(payload.get("access"), str) and payload["access"]
    assert isinstance(payload.get("refresh"), str) and payload["refresh"]


async def test_jwt_token_obtain_pair_rejects_invalid_credentials(
    async_api_client, user
):
    response = await async_api_client.post(
        "/api/auth/token/",
        json={"username": user.username, "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert "detail" in response.json()


async def test_jwt_refresh_returns_new_access_token(async_api_client, user):
    token_response = await async_api_client.post(
        "/api/auth/token/",
        json={"username": user.username, "password": "test-pass-123"},
    )
    refresh_token = token_response.json()["refresh"]

    refresh_response = await async_api_client.post(
        "/api/auth/token/refresh/",
        json={"refresh": refresh_token},
    )

    payload = refresh_response.json()
    assert refresh_response.status_code == 200
    assert isinstance(payload.get("access"), str) and payload["access"]


async def test_protected_endpoints_require_valid_access_token(async_api_client, user):
    unauthorized = await async_api_client.get("/api/users/me/")
    assert unauthorized.status_code == 401

    invalid_token_response = await async_api_client.get(
        "/api/users/me/",
        headers=_auth_headers("not-a-valid-jwt"),
    )
    assert invalid_token_response.status_code == 401

    token_response = await async_api_client.post(
        "/api/auth/token/",
        json={"username": user.username, "password": "test-pass-123"},
    )
    access_token = token_response.json()["access"]
    refresh_token = token_response.json()["refresh"]

    with_access = await async_api_client.get(
        "/api/users/me/", headers=_auth_headers(access_token)
    )
    assert with_access.status_code == 200
    assert with_access.json()["username"] == user.username

    with_refresh = await async_api_client.get(
        "/api/users/me/", headers=_auth_headers(refresh_token)
    )
    assert with_refresh.status_code == 401


async def test_user_me_endpoint_only_updates_authenticated_user(
    async_api_client, user, second_user
):
    token_response = await async_api_client.post(
        "/api/auth/token/",
        json={"username": user.username, "password": "test-pass-123"},
    )
    access_token = token_response.json()["access"]

    response = await async_api_client.patch(
        "/api/users/me/",
        headers=_auth_headers(access_token),
        json={"first_name": "OwnerOnly"},
    )

    await sync_to_async(user.refresh_from_db)()
    await sync_to_async(second_user.refresh_from_db)()

    assert response.status_code == 200
    assert user.first_name == "OwnerOnly"
    assert second_user.first_name == ""
