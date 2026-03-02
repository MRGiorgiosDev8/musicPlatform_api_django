from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def send_public_playlist_comment_event(playlist_id: int, payload: dict):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    async_to_sync(channel_layer.group_send)(
        f"playlist_comments_{playlist_id}",
        {
            "type": "comment.message",
            "payload": payload,
        },
    )
