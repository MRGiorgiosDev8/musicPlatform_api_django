"""
Development settings for music_project project.
"""
from .base import *

# Включаем режим отладки для разработки
DEBUG = True

# База данных берется из DATABASE_URL (PostgreSQL)

# Разрешённые хосты для разработки
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Отправка писем в консоль для удобства отладки email
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Отключаем сжатие для удобства отладки статики
COMPRESS_ENABLED = False
COMPRESS_OFFLINE = False

# Хранение статических файлов без сжатия
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Настройки CORS для разработки (раскомментировать при необходимости)
# CORS_ALLOW_ALL_ORIGINS = True

# Настройки debug toolbar (если установлен, раскомментировать)
# INSTALLED_APPS += ['debug_toolbar']
# MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
# INTERNAL_IPS = ['127.0.0.1']
