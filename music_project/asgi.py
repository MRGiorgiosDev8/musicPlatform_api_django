"""
ASGI config for music_project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.conf import settings
from django.core.asgi import get_asgi_application

if os.environ.get("USE_DOCKER") == "true":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "music_project.settings.prod")
else:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "music_project.settings.dev")

django_asgi_app = get_asgi_application()

from .routing import websocket_urlpatterns  # noqa: E402

websocket_app = AuthMiddlewareStack(URLRouter(websocket_urlpatterns))
if not settings.DEBUG:
    websocket_app = AllowedHostsOriginValidator(websocket_app)

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": websocket_app,
    }
)
