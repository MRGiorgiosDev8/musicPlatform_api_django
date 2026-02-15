import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


pytestmark = pytest.mark.django_db


# 1x1 transparent PNG
PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0dIDATx\x9cc```\xf8"
    b"\x0f\x00\x01\x04\x01\x00\xa5\x9f\x81\x81\x00\x00\x00\x00IEND\xaeB`\x82"
)


def auth_client_for_user(user):
    client = APIClient()
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def test_user_me_requires_authentication():
    client = APIClient()
    response = client.get("/api/users/me/")

    assert response.status_code == 401


def test_user_me_returns_current_user_data(user):
    client = auth_client_for_user(user)

    response = client.get("/api/users/me/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == user.id
    assert payload["username"] == user.username
    assert payload["email"] == user.email


def test_user_me_updates_profile_fields_but_not_read_only(user):
    client = auth_client_for_user(user)

    response = client.patch(
        "/api/users/me/",
        data={
            "first_name": "Ruby",
            "last_name": "Sound",
            "bio": "Music lover",
            "country": "US",
            "username": "should_not_change",
            "email": "new-email@example.com",
        },
        format="json",
    )

    user.refresh_from_db()

    assert response.status_code == 200
    assert user.first_name == "Ruby"
    assert user.last_name == "Sound"
    assert user.bio == "Music lover"
    assert user.country == "US"
    assert user.username != "should_not_change"
    assert user.email != "new-email@example.com"


import io
from PIL import Image  # Убедись, что pillow установлен
from django.core.files.uploadedfile import SimpleUploadedFile


def test_user_me_allows_avatar_upload(user):
    client = auth_client_for_user(user)

    # Генерируем полноценное изображение в памяти
    file = io.BytesIO()
    image = Image.new('RGB', size=(10, 10), color=(255, 0, 0))
    image.save(file, 'png')
    file.seek(0)

    avatar = SimpleUploadedFile(
        "avatar.png",
        file.read(),
        content_type="image/png"
    )

    response = client.patch(
        "/api/users/me/",
        data={"avatar": avatar},
        format="multipart",  # DRF автоматически установит правильный Boundary
    )

    # Если всё равно 400, выведи ошибку, чтобы понять, что именно не так
    if response.status_code == 400:
        print(f"Ошибки валидации: {response.json()}")

    user.refresh_from_db()

    assert response.status_code == 200
    assert user.avatar
    assert "avatars/" in user.avatar.name

    # Чистим за собой
    user.avatar.delete(save=False)