"""
ASGI config for music_project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

# Используем настройки для продакшена в Docker, иначе настройки для разработки
if os.environ.get('USE_DOCKER') == 'true':
    # Устанавливаем переменную окружения для продакшен настроек
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'music_project.settings.prod')
else:
    # Устанавливаем переменную окружения для девелопмент настроек
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'music_project.settings.dev')

# Получаем ASGI приложение с текущими настройками
application = get_asgi_application()
