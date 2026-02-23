"""
ASGI config for music_project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

if os.environ.get("USE_DOCKER") == "true":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "music_project.settings.prod")
else:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "music_project.settings.dev")

application = get_asgi_application()
