import os

import pytest
import pytest_asyncio
from django.contrib.auth import get_user_model
from django.core.cache import cache
from httpx import ASGITransport, AsyncClient
from rest_framework_simplejwt.tokens import RefreshToken

# Устанавливаем тестовые настройки ДО импорта ASGI приложения
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "music_project.settings.test")

from music_project.asgi import application


@pytest.fixture(autouse=True)
def clear_cache_between_tests():
    cache.clear()
    yield
    cache.clear()


@pytest_asyncio.fixture
async def async_api_client():
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.fixture
def user(db):
    User = get_user_model()
    return User.objects.create_user(
        username="tester",
        email="tester@example.com",
        password="test-pass-123",
    )


@pytest_asyncio.fixture
async def authorized_async_api_client(async_api_client, user):
    refresh = RefreshToken.for_user(user)
    token = str(refresh.access_token)
    async_api_client.headers.update({"Authorization": f"Bearer {token}"})
    yield async_api_client
