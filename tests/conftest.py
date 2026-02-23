import os
import uuid

import pytest
import pytest_asyncio
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connections
from httpx import ASGITransport, AsyncClient
from rest_framework_simplejwt.tokens import RefreshToken

# Устанавливаем тестовые настройки ДО инициализации Django ASGI приложения
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "music_project.settings.test")


@pytest.fixture(autouse=True)
def clear_cache_between_tests():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture(autouse=True)
def close_db_connections_between_tests():
    yield
    connections.close_all()


@pytest_asyncio.fixture
async def async_api_client():
    from music_project.asgi import application

    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.fixture
def user(db):
    User = get_user_model()
    suffix = uuid.uuid4().hex[:8]
    username = f"tester_{suffix}"
    email = f"tester_{suffix}@example.com"
    user = User.objects.create_user(
        username=username, email=email, password="test-pass-123"
    )
    # Создаем плейлист для пользователя
    from music_api.models import Playlist
    Playlist.objects.create(
        user=user, title="Test Playlist", tracks=[]
    )
    return user


@pytest_asyncio.fixture
async def authorized_async_api_client(async_api_client, user):
    refresh = RefreshToken.for_user(user)
    token = str(refresh.access_token)
    async_api_client.headers.update({"Authorization": f"Bearer {token}"})
    yield async_api_client
