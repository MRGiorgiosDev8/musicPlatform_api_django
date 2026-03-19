"""
Production settings for music_project project.
"""

# Добавляем noqa, чтобы линтер не ругался на неиспользуемый импорт *
from .base import *  # noqa: F403, F401

# Отключаем режим отладки в продакшене
DEBUG = False

# Разрешённые хосты для продакшена
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1,0.0.0.0").split(
    ","
)

# Настройки безопасности
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_SECONDS = 0
SECURE_REDIRECT_EXEMPT = []
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
X_FRAME_OPTIONS = "DENY"
CSRF_TRUSTED_ORIGINS = [
    "https://georgios8-rubysoundfm.onrender.com",
]

# Настройки почтового сервера
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="")
EMAIL_PORT = config("EMAIL_PORT", cast=int, default=587)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", cast=bool, default=True)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")

# Хранение и сжатие статических файлов
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

COMPRESS_ENABLED = False
COMPRESS_OFFLINE = False

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "music_api": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "storages": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "boto3": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "botocore": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# S3 storage (django-storages, Supabase-compatible)
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME", "avatars")
AWS_S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL")

if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    AWS_S3_REGION_NAME = "eu-west-1"
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_VERIFY = True
    AWS_S3_ADDRESSING_STYLE = "path"
    AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}
    AWS_QUERYSTRING_AUTH = False
    AWS_DEFAULT_ACL = None

    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "access_key": AWS_ACCESS_KEY_ID,
                "secret_key": AWS_SECRET_ACCESS_KEY,
                "bucket_name": AWS_STORAGE_BUCKET_NAME,
                "endpoint_url": AWS_S3_ENDPOINT_URL,
                "region_name": AWS_S3_REGION_NAME,
                "signature_version": "s3v4",
                "addressing_style": "path",
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
        },
    }

    MEDIA_URL = f"{AWS_S3_ENDPOINT_URL.rstrip('/')}/{AWS_STORAGE_BUCKET_NAME}/"

    # Проверка S3 при запуске (Supabase/S3 совместимый)
    try:
        import boto3
        from botocore.config import Config
        from botocore.exceptions import BotoCoreError, ClientError

        s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_S3_REGION_NAME,
            endpoint_url=AWS_S3_ENDPOINT_URL or None,
            config=Config(s3={"addressing_style": "path"}),
        )
        s3_client.head_bucket(Bucket=AWS_STORAGE_BUCKET_NAME)
        print("🚀 S3 CHECK: Connection Successful!")
    except (BotoCoreError, ClientError, Exception) as e:
        print(f"❌ S3 CHECK SKIPPED/FAILED: {e}")
else:
    DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"

# Переопределяем кэш для продакшена (Render Redis)
REDIS_URL = config("REDIS_URL", default=None)

if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "IGNORE_EXCEPTIONS": True,
            },
            "TIMEOUT": 3600,
            "KEY_PREFIX": "rubysound_prod",
        }
    }

    # Настройка для Django Channels через Redis
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
            },
        }
    }

# Проверка Redis при запуске. Используем прямой импорт из django_redis,
# чтобы не дожидаться инициализации всей экосистемы кэша Django.
if REDIS_URL:
    try:
        from redis import Redis

        # Парсим URL вручную для быстрой проверки соединения
        client = Redis.from_url(REDIS_URL, socket_connect_timeout=2)
        if client.ping():
            print("🚀 REDIS CHECK: Connection Successful!")
        client.close()
    except Exception as e:
        print(f"❌ REDIS ERROR: {e}")
