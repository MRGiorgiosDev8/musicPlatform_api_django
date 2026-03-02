from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def send_user_notification(user_id: int, payload: dict):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    async_to_sync(channel_layer.group_send)(
        f"user_notifications_{user_id}",
        {
            "type": "notify.message",
            "payload": payload,
        },
    )
