from django.urls import path

from music_api.consumers import PublicPlaylistCommentsConsumer
from users.consumers import NotificationConsumer, PresenceConsumer

websocket_urlpatterns = [
    path("ws/notifications/", NotificationConsumer.as_asgi()),
    path("ws/presence/", PresenceConsumer.as_asgi()),
    path(
        "ws/comments/public/<str:username>/",
        PublicPlaylistCommentsConsumer.as_asgi(),
    ),
]
