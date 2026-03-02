from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from .presence import (
    decrement_user_connections,
    increment_user_connections,
    is_user_online,
)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        self.group_name = f"user_notifications_{user.pk}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Клиентские команды пока не используются; держим endpoint read-only.
        return

    async def notify_message(self, event):
        await self.send_json(event.get("payload", {}))


class PresenceConsumer(AsyncJsonWebsocketConsumer):
    @staticmethod
    def group_name_for_user(user_id: int) -> str:
        return f"user_presence_{user_id}"

    @staticmethod
    def normalize_user_id(raw_user_id):
        try:
            user_id = int(raw_user_id)
        except (TypeError, ValueError):
            return None
        if user_id <= 0:
            return None
        return user_id

    async def connect(self):
        user = self.scope.get("user")
        self.user_id = None
        self.watched_user_ids = set()

        if user and not isinstance(user, AnonymousUser) and user.is_authenticated:
            self.user_id = user.pk
            became_online = await sync_to_async(increment_user_connections)(
                self.user_id
            )
            if became_online:
                await self.channel_layer.group_send(
                    self.group_name_for_user(self.user_id),
                    {
                        "type": "presence.changed",
                        "user_id": self.user_id,
                        "is_online": True,
                    },
                )

        await self.accept()

    async def disconnect(self, close_code):
        for watched_user_id in self.watched_user_ids:
            await self.channel_layer.group_discard(
                self.group_name_for_user(watched_user_id),
                self.channel_name,
            )

        if self.user_id:
            became_offline = await sync_to_async(decrement_user_connections)(
                self.user_id
            )
            if became_offline:
                await self.channel_layer.group_send(
                    self.group_name_for_user(self.user_id),
                    {
                        "type": "presence.changed",
                        "user_id": self.user_id,
                        "is_online": False,
                    },
                )

    async def receive_json(self, content, **kwargs):
        action = content.get("action")
        raw_user_id = content.get("user_id")
        user_id = self.normalize_user_id(raw_user_id)
        if not user_id:
            return

        if action == "watch_user":
            await self.watch_user(user_id)
        elif action == "unwatch_user":
            await self.unwatch_user(user_id)

    async def watch_user(self, user_id: int):
        if user_id not in self.watched_user_ids:
            self.watched_user_ids.add(user_id)
            await self.channel_layer.group_add(
                self.group_name_for_user(user_id),
                self.channel_name,
            )

        online_now = await sync_to_async(is_user_online)(user_id)
        await self.send_json(
            {
                "type": "presence_status",
                "user_id": user_id,
                "is_online": online_now,
            }
        )

    async def unwatch_user(self, user_id: int):
        if user_id in self.watched_user_ids:
            self.watched_user_ids.remove(user_id)
            await self.channel_layer.group_discard(
                self.group_name_for_user(user_id),
                self.channel_name,
            )

    async def presence_changed(self, event):
        await self.send_json(
            {
                "type": "presence_status",
                "user_id": event.get("user_id"),
                "is_online": bool(event.get("is_online")),
            }
        )
