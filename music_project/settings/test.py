"""Test settings for music_project.

This profile keeps PostgreSQL for test DB to validate JSONField/select_for_update behavior.
"""

import os

import dj_database_url
from decouple import config

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("LASTFM_KEY", "test-lastfm-key")
os.environ.setdefault("DATABASE_URL", "postgres://postgres:postgres@postgres:5432/music_platform")

from .base import *

DEBUG = False
COMPRESS_ENABLED = False
COMPRESS_OFFLINE = False
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

TEST_DATABASE_URL = config("TEST_DATABASE_URL", default=config("DATABASE_URL", default=""))
if not TEST_DATABASE_URL:
    raise RuntimeError("TEST_DATABASE_URL or DATABASE_URL must be set to a PostgreSQL URL for tests")

DATABASES["default"] = dj_database_url.parse(TEST_DATABASE_URL)
engine = DATABASES["default"].get("ENGINE", "")
if "postgresql" not in engine:
    raise RuntimeError(f"PostgreSQL is required for tests, got ENGINE={engine!r}")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "musicplatform-tests",
    }
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
}

ASGI_ALLOWED_HOSTS = ['*']

DJANGO_ALLOW_ASYNC_UNSAFE = True
