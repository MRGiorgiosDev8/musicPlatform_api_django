from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model

from .models import Playlist

User = get_user_model()


@sync_to_async
def _resolve_public_playlist_id_by_username(username: str):
    owner = (
        User.objects.filter(username__iexact=username, is_public_favorites=True)
        .only("id")
        .first()
    )
    if owner is None:
        return None

    playlist = Playlist.objects.filter(user=owner).order_by("created_at").first()
    if playlist is None:
        playlist = Playlist.objects.create(user=owner, title="Favorites", tracks=[])

    return playlist.id


class PublicPlaylistCommentsConsumer(AsyncJsonWebsocketConsumer):
    @staticmethod
    def group_name_for_playlist(playlist_id: int) -> str:
        return f"playlist_comments_{playlist_id}"

    async def connect(self):
        username = (self.scope.get("url_route", {}).get("kwargs", {}) or {}).get(
            "username", ""
        )
        playlist_id = await _resolve_public_playlist_id_by_username(username)
        if not playlist_id:
            await self.close(code=4404)
            return

        self.group_name = self.group_name_for_playlist(playlist_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        return

    async def comment_message(self, event):
        await self.send_json(event.get("payload", {}))
