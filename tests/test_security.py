import pytest
from django.test import Client
from django.middleware.csrf import get_token
from users.forms import SignupForm


pytestmark = [pytest.mark.django_db(transaction=True)]


def test_signup_form_rejects_xss_payload_in_username():
    form = SignupForm(
        data={
            "username": "<script>alert(1)</script>",
            "email": "safe@example.com",
            "password": "StrongPass_123!",
            "password_confirm": "StrongPass_123!",
        }
    )

    assert not form.is_valid()
    assert "username" in form.errors


def test_csrf_protection_blocks_session_post_without_csrf(user):
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)

    response = client.post(
        "/api/playlists/me/tracks/",
        data={"name": "Numb", "artist": "Linkin Park"},
        content_type="application/json",
    )

    assert response.status_code == 403

def test_csrf_protection_allows_session_post_with_csrf(user):
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)

    response = client.get("/login/", follow=True)

    csrf_token = get_token(response.wsgi_request)

    response = client.post(
        "/api/playlists/me/tracks/",
        data='{"name":"Numb","artist":"Linkin Park"}',
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
        HTTP_REFERER="http://testserver/login/"
    )

    if response.status_code != 201:
        print(f"Debug CSRF failure: {response.content}")

    assert response.status_code == 201
    assert response.json()["detail"] == "Track added."


@pytest.mark.asyncio
async def test_token_endpoint_rejects_basic_sql_injection(async_api_client):
    response = await async_api_client.post(
        "/api/auth/token/",
        json={"username": "' OR 1=1 --", "password": "any-pass"},
    )

    assert response.status_code == 401
    payload = response.json()
    assert "access" not in payload
    assert "refresh" not in payload


@pytest.mark.asyncio
async def test_playlist_add_track_validates_required_fields(authorized_async_api_client):
    response = await authorized_async_api_client.post(
        "/api/playlists/me/tracks/",
        json={"name": "   ", "artist": ""},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Both name and artist are required."
